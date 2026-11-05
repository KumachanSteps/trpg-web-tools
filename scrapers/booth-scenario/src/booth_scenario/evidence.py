"""(Re)derive rule evidence for a product from what is stored: description
text, title and tags. Runs after every fetch, and offline via `reextract`."""
from __future__ import annotations

from . import store
from .tendency import extract_tendency
from .rules import (classify_edition_kind, default_roles, default_session_mode, extract_all, extract_systems_meta,
                    has_secret_handouts, session_modes_from_title)


def rebuild_evidence(conn, iid: int) -> int:
    p = conn.execute("SELECT title, listing_title, description_text FROM products WHERE booth_item_id=?", (iid,)).fetchone()
    if p is None:
        return 0
    tags = [r[0] for r in conn.execute("SELECT tag FROM product_tags WHERE booth_item_id=?", (iid,))]
    # Label rules change over time; keep stored edition kinds in step with them.
    for vid, label in conn.execute("SELECT variant_id, variant_label FROM product_variants WHERE booth_item_id=?", (iid,)).fetchall():
        conn.execute("UPDATE product_variants SET edition_kind=? WHERE variant_id=?", (classify_edition_kind(label), vid))
    # Facts derived from old evidence are rebuilt by organize; drop them with it.
    old = "SELECT evidence_id FROM extraction_evidence WHERE booth_item_id=? AND extraction_method IN ('REGEX','RULE')"
    for t in ("scenario_systems", "scenario_session_modes", "scenario_durations", "scenario_conditions", "scenario_assets"):
        conn.execute(f"DELETE FROM {t} WHERE evidence_id IN ({old})", (iid,))
    conn.execute("DELETE FROM extraction_evidence WHERE booth_item_id=? AND extraction_method IN ('REGEX','RULE')", (iid,))
    hits = extract_all(p["description_text"] or "") + extract_tendency(p["description_text"] or "")
    described = {h.value["system_code"] for h in hits if h.field_path == "scenario_systems"}
    # Title/tag hints only when the description does not state what the work is
    # for: a tag like "クトゥルフ神話TRPG" would otherwise add 6th edition to a
    # 7th-edition work. A conversion note alone ("7版変換可") states nothing.
    stated = any(h.value["support_type"] in ("NATIVE", "SUPPORTED") for h in hits if h.field_path == "scenario_systems")
    if not stated:
        hits += [h for h in extract_systems_meta(p["title"] or p["listing_title"] or "", tags) if h.value["system_code"] not in described]
    systems = {h.value["system_code"] for h in hits if h.field_path == "scenario_systems"}
    if not any(h.field_path == "scenario_session_modes" for h in hits):
        hits += session_modes_from_title(p["title"] or p["listing_title"] or "") or [default_session_mode()]
    secret = has_secret_handouts(p["title"] or p["listing_title"] or "", " ".join(tags), p["description_text"] or "")
    for h in hits:
        if h.field_path == "scenario_session_modes":
            h.value = default_roles(h.value, systems)
            # Secret handouts are between players: not for solo or タイマン play.
            if secret and h.value["mode"] in ("MULTI_PL", "GMLESS_MULTI"):
                h.value["secret_handouts"] = 1
    for h in hits:
        store.save_evidence(conn, iid, h, section="description" if not h.excerpt.startswith("[") else h.excerpt[1:h.excerpt.index("]")])
    conn.commit()
    return len(hits)


def rebuild_all(conn) -> int:
    n = 0
    for (iid,) in conn.execute("SELECT booth_item_id FROM products WHERE detail_fetched_at IS NOT NULL").fetchall():
        n += rebuild_evidence(conn, iid)
    return n
