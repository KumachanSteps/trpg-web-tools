"""Writes parsed public catalog facts into SQLite. Never writes acquisition data."""
from __future__ import annotations

import hashlib
import json
import sqlite3

from . import PARSER_VERSION
from .db import new_id, utcnow
from .parsers.detail import DetailRecord
from .parsers.listing import ListingPage
from .rules import Hit


def product_url(item_id: int) -> str:
    return f"https://booth.pm/ja/items/{item_id}"


def ensure_product(conn: sqlite3.Connection, item_id: int, seen_at: str | None = None) -> None:
    now = seen_at or utcnow()
    conn.execute(
        """INSERT INTO products (booth_item_id, product_url, first_seen_at, last_seen_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(booth_item_id) DO UPDATE SET last_seen_at = excluded.last_seen_at""",
        (item_id, product_url(item_id), now, now),
    )
    conn.execute(
        "INSERT OR IGNORE INTO crawl_queue (booth_item_id, state, updated_at) VALUES (?, 'DISCOVERED', ?)",
        (item_id, now),
    )


def ensure_search_query(conn, category_path: str, tag: str | None, in_stock: bool, sort_mode: str | None = None) -> str:
    row = conn.execute(
        "SELECT search_query_id FROM search_queries WHERE category_path=? AND tag IS ? AND in_stock=? AND sort_mode IS ? AND keyword IS NULL",
        (category_path, tag, int(in_stock), sort_mode),
    ).fetchone()
    if row:
        return row[0]
    qid = new_id("SQ")
    conn.execute("INSERT INTO search_queries VALUES (?, ?, ?, NULL, ?, ?)", (qid, category_path, tag, sort_mode, int(in_stock)))
    return qid


def _note_listing_card(conn, card, now: str) -> None:
    """Store the card's title/price; if they changed since the last pass and the
    detail page was already parsed, queue the item for a detail refetch."""
    prev = conn.execute(
        "SELECT listing_title, listing_price_jpy, listing_price_multi FROM products WHERE booth_item_id=?", (card.booth_item_id,)
    ).fetchone()
    multi = None if card.price_multi is None else int(card.price_multi)
    changed = prev["listing_title"] is not None and (
        (card.title is not None and card.title != prev["listing_title"])
        or (card.price_jpy is not None and card.price_jpy != prev["listing_price_jpy"])
        or (multi is not None and multi != prev["listing_price_multi"])
    )
    conn.execute(
        """UPDATE products SET listing_title=COALESCE(?, listing_title), listing_price_jpy=COALESCE(?, listing_price_jpy),
             listing_price_multi=COALESCE(?, listing_price_multi) WHERE booth_item_id=?""",
        (card.title, card.price_jpy, multi, card.booth_item_id),
    )
    if changed:
        conn.execute(
            "UPDATE crawl_queue SET state='QUEUED', next_attempt_at=NULL, updated_at=?, last_error='listing changed' WHERE booth_item_id=? AND state IN ('PARSED','SKIPPED')",
            (now, card.booth_item_id),
        )


def save_listing(conn, query_id: str, page_number: int, page: ListingPage, http_status: int, fetched_at: str) -> str:
    cpid = new_id("CP")
    conn.execute(
        "INSERT INTO crawl_pages VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (cpid, query_id, page_number, page.url, fetched_at, http_status, page.card_count, page.next_page_url),
    )
    for card in page.cards:
        ensure_product(conn, card.booth_item_id, fetched_at)
        conn.execute("INSERT OR IGNORE INTO search_hits VALUES (?, ?, ?)", (cpid, card.booth_item_id, card.position))
        _note_listing_card(conn, card, fetched_at)
        if card.like_count is not None:
            conn.execute(
                "UPDATE products SET like_count=?, like_count_source='SEARCH_CARD', like_observed_at=? WHERE booth_item_id=? AND like_count_source IS NOT 'PUBLIC_STRUCTURED_DATA'",
                (card.like_count, fetched_at, card.booth_item_id),
            )
    conn.commit()
    return cpid


def _publisher(conn, name: str | None, url: str | None, now: str) -> str | None:
    if not name:
        return None
    # shop_url is the stable key; shop names can be renamed.
    if url:
        row = conn.execute("SELECT publisher_id FROM publishers WHERE shop_url=?", (url,)).fetchone()
    else:
        row = conn.execute("SELECT publisher_id FROM publishers WHERE shop_url IS NULL AND shop_name=?", (name,)).fetchone()
    if row:
        conn.execute("UPDATE publishers SET shop_name=?, last_seen_at=? WHERE publisher_id=?", (name, now, row[0]))
        return row[0]
    pid = new_id("PUB")
    conn.execute("INSERT INTO publishers VALUES (?, ?, ?, ?)", (pid, name, url, now))
    return pid


def save_detail(conn, rec: DetailRecord, fetched_at: str, raw: str) -> None:
    ensure_product(conn, rec.booth_item_id, fetched_at)
    pub = _publisher(conn, rec.shop_name, rec.shop_url, fetched_at)
    conn.execute(
        """UPDATE products SET publisher_id=COALESCE(?, publisher_id), title=COALESCE(?, title),
             category_name=COALESCE(?, category_name), category_path=COALESCE(?, category_path),
             description_text=COALESCE(?, description_text), language=COALESCE(?, language),
             cover_image_url=COALESCE(?, cover_image_url),
             listing_status=?, detail_fetched_at=?, content_hash=?
           WHERE booth_item_id=?""",
        (pub, rec.title, rec.category_name, rec.category_path, rec.description_text, rec.language,
         rec.cover_image_url,
         rec.listing_status, fetched_at, hashlib.sha256(raw.encode()).hexdigest(), rec.booth_item_id),
    )
    if rec.like_count is not None:
        conn.execute("UPDATE products SET like_count=?, like_count_source=?, like_observed_at=? WHERE booth_item_id=?",
                     (rec.like_count, rec.like_count_source, fetched_at, rec.booth_item_id))
    else:
        conn.execute("UPDATE products SET like_count_source='UNAVAILABLE' WHERE booth_item_id=? AND like_count IS NULL", (rec.booth_item_id,))
    # JSON confirms the tag set even when empty; HTML gives tags only when found.
    if rec.tags or "tags" in rec.present_keys:
        conn.execute("DELETE FROM product_tags WHERE booth_item_id=?", (rec.booth_item_id,))
        conn.executemany("INSERT OR IGNORE INTO product_tags VALUES (?, ?)", [(rec.booth_item_id, t) for t in rec.tags])
    seen_ids: list[str] = []
    for v in rec.variants:
        existing = None
        if v.external_variant_id:
            existing = conn.execute("SELECT variant_id FROM product_variants WHERE booth_item_id=? AND external_variant_id=?", (rec.booth_item_id, v.external_variant_id)).fetchone()
            # Adopt a row saved earlier from HTML without an ID (same item, same label).
            existing = existing or conn.execute("SELECT variant_id FROM product_variants WHERE booth_item_id=? AND external_variant_id IS NULL AND variant_label=?", (rec.booth_item_id, v.label)).fetchone()
        else:
            # Provisional reconciliation by item ID + label (see SCHEMA_SPEC); an
            # ID-less HTML row also lands on a JSON row with the same label.
            existing = conn.execute(
                "SELECT variant_id FROM product_variants WHERE booth_item_id=? AND variant_label=? ORDER BY external_variant_id IS NULL LIMIT 1",
                (rec.booth_item_id, v.label)).fetchone()
        vid = existing[0] if existing else new_id("VAR")
        seen_ids.append(vid)
        conn.execute(
            """INSERT INTO product_variants (variant_id, booth_item_id, external_variant_id, variant_label, price_jpy, availability, delivery_type, edition_kind)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(variant_id) DO UPDATE SET external_variant_id=COALESCE(excluded.external_variant_id, external_variant_id), variant_label=excluded.variant_label,
                 price_jpy=COALESCE(excluded.price_jpy, price_jpy),
                 availability=CASE excluded.availability WHEN 'UNKNOWN' THEN availability ELSE excluded.availability END,
                 delivery_type=CASE WHEN excluded.delivery_type IS NULL OR excluded.delivery_type='UNKNOWN' THEN COALESCE(delivery_type, excluded.delivery_type) ELSE excluded.delivery_type END,
                 edition_kind=CASE excluded.edition_kind WHEN 'UNKNOWN' THEN edition_kind ELSE excluded.edition_kind END""",
            (vid, rec.booth_item_id, v.external_variant_id, v.label, v.price_jpy, v.availability, v.delivery_type, v.edition_kind),
        )
    if "variations" in rec.present_keys:
        # The item JSON lists every current variation: rows missing from it are
        # no longer offered, so they must not keep an AVAILABLE status.
        marks = ",".join("?" * len(seen_ids))
        # ID-less rows left from HTML parsing ("(offer)", "ダウンロード商品") are not variants.
        conn.execute(
            f"""DELETE FROM variant_scenarios WHERE variant_id IN (SELECT variant_id FROM product_variants
                WHERE booth_item_id=? AND external_variant_id IS NULL AND variant_id NOT IN ({marks or 'NULL'})
                AND variant_id NOT IN (SELECT variant_id FROM acquisition_records WHERE variant_id IS NOT NULL))""",
            (rec.booth_item_id, *seen_ids),
        )
        conn.execute(
            f"""DELETE FROM product_variants WHERE booth_item_id=? AND external_variant_id IS NULL AND variant_id NOT IN ({marks or 'NULL'})
                AND variant_id NOT IN (SELECT variant_id FROM acquisition_records WHERE variant_id IS NOT NULL)""",
            (rec.booth_item_id, *seen_ids),
        )
        conn.execute(
            f"UPDATE product_variants SET availability='UNAVAILABLE' WHERE booth_item_id=? AND variant_id NOT IN ({marks or 'NULL'})",
            (rec.booth_item_id, *seen_ids),
        )
    conn.execute("UPDATE crawl_queue SET state='PARSED', updated_at=?, last_error=NULL WHERE booth_item_id=?", (fetched_at, rec.booth_item_id))
    conn.commit()


def save_evidence(conn, item_id: int, hit: Hit, scenario_id: str | None = None, section: str | None = "description") -> str:
    eid = new_id("EV")
    conn.execute(
        "INSERT INTO extraction_evidence VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (eid, item_id, scenario_id, f"{hit.field_path}:{json.dumps(hit.value, ensure_ascii=False)}", hit.excerpt[:500], section, hit.method, hit.confidence, PARSER_VERSION, utcnow()),
    )
    return eid


def mark_error(conn, item_id: int, error: str, state: str = "RETRY") -> None:
    ensure_product(conn, item_id)
    conn.execute("UPDATE crawl_queue SET state=?, attempt_count=attempt_count+1, last_error=?, updated_at=? WHERE booth_item_id=?",
                 (state, error[:500], utcnow(), item_id))
    conn.commit()


def load_synthetic_fixture(conn, fixture: dict, availability: str = "AVAILABLE") -> None:
    """Load example_synthetic.json-shaped data. The fixture gives no availability,
    so the caller states it explicitly (tests use AVAILABLE)."""
    now = utcnow()
    p = fixture["product"]
    ensure_product(conn, p["booth_item_id"], now)
    conn.execute("UPDATE products SET title=?, like_count=?, like_count_source=?, detail_fetched_at=? WHERE booth_item_id=?",
                 (p["title"], p.get("like_count"), "UNAVAILABLE" if p.get("like_count") is None else "PRODUCT_PAGE", now, p["booth_item_id"]))
    col = fixture.get("collection")
    scenario_ids = set(col["scenario_ids"]) if col else set()
    for v in fixture["variants"]:
        scenario_ids |= {i["scenario_id"] for i in v["included"]}
    for sid in sorted(scenario_ids):
        conn.execute("INSERT OR IGNORE INTO scenarios (scenario_id, canonical_title, created_at, updated_at) VALUES (?, ?, ?, ?)", (sid, sid, now, now))
        conn.execute("INSERT OR IGNORE INTO product_scenarios VALUES (?, ?, ?)", (p["booth_item_id"], sid, "COLLECTION_MEMBER" if col else "STANDALONE"))
    if col:
        conn.execute("INSERT OR IGNORE INTO collections (collection_id, title, collection_type) VALUES (?, ?, 'ANTHOLOGY')", (col["collection_id"], p["title"]))
        for i, sid in enumerate(col["scenario_ids"], 1):
            conn.execute("INSERT OR IGNORE INTO collection_scenarios (collection_id, scenario_id, display_order) VALUES (?, ?, ?)", (col["collection_id"], sid, i))
        conn.execute("INSERT OR IGNORE INTO product_collections VALUES (?, ?, 'FULL_COLLECTION')", (p["booth_item_id"], col["collection_id"]))
    for v in fixture["variants"]:
        conn.execute(
            "INSERT INTO product_variants (variant_id, booth_item_id, variant_label, price_jpy, availability, edition_kind) VALUES (?, ?, ?, ?, ?, ?)",
            (v["variant_id"], p["booth_item_id"], v["label"], v.get("price_jpy"), availability, v["edition_kind"]),
        )
        for inc in v["included"]:
            conn.execute("INSERT INTO variant_scenarios VALUES (?, ?, ?, 'VERIFIED')", (v["variant_id"], inc["scenario_id"], inc["coverage"]))
    conn.commit()
