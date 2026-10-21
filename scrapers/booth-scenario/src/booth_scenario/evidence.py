"""(Re)derive rule evidence for a product from what is stored: description
text, title and tags. Runs after every fetch, and offline via `reextract`."""
from __future__ import annotations

from . import store
from .rules import classify_edition_kind, extract_all, extract_systems_meta


def rebuild_evidence(conn, iid: int) -> int:
    p = conn.execute("SELECT title, listing_title, description_text FROM products WHERE booth_item_id=?", (iid,)).fetchone()
    if p is None:
        return 0
    tags = [r[0] for r in conn.execute("SELECT tag FROM product_tags WHERE booth_item_id=?", (iid,))]
    # Label rules change over time; keep stored edition kinds in step with them.
    for vid, label in conn.execute("SELECT variant_id, variant_label FROM product_variants WHERE booth_item_id=?", (iid,)).fetchall():
        conn.execute("UPDATE product_variants SET edition_kind=? WHERE variant_id=?", (classify_edition_kind(label), vid))
    # Rows referencing old evidence are rebuilt by organize; detach them first.
    old = "SELECT evidence_id FROM extraction_evidence WHERE booth_item_id=? AND extraction_method IN ('REGEX','RULE')"
    for t in ("scenario_systems", "scenario_session_modes", "scenario_durations", "scenario_conditions", "scenario_assets"):
        conn.execute(f"UPDATE {t} SET evidence_id=NULL WHERE evidence_id IN ({old})", (iid,))
    conn.execute("DELETE FROM extraction_evidence WHERE booth_item_id=? AND extraction_method IN ('REGEX','RULE')", (iid,))
    hits = extract_all(p["description_text"] or "")
    described = {h.value["system_code"] for h in hits if h.field_path == "scenario_systems"}
    hits += [h for h in extract_systems_meta(p["title"] or p["listing_title"] or "", tags) if h.value["system_code"] not in described]
    for h in hits:
        store.save_evidence(conn, iid, h, section="description" if not h.excerpt.startswith("[") else h.excerpt[1:h.excerpt.index("]")])
    conn.commit()
    return len(hits)


def rebuild_all(conn) -> int:
    n = 0
    for (iid,) in conn.execute("SELECT booth_item_id FROM products WHERE detail_fetched_at IS NOT NULL").fetchall():
        n += rebuild_evidence(conn, iid)
    return n
