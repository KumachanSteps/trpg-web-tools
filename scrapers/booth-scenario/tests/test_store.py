import json

from booth_scenario import store
from booth_scenario.parsers.detail import parse_item_json
from booth_scenario.parsers.listing import parse_listing
from booth_scenario.report import coverage
from booth_scenario.rules import extract_all


def test_listing_then_detail_roundtrip(conn):
    qid = store.ensure_search_query(conn, "Tabletop RPG", "クトゥルフ神話TRPG", True)
    assert store.ensure_search_query(conn, "Tabletop RPG", "クトゥルフ神話TRPG", True) == qid
    page = parse_listing('<a href="/ja/items/42">x</a>', "https://booth.pm/en/browse/x", selectors={})
    store.save_listing(conn, qid, 1, page, 200, "2026-10-21T00:00:00+00:00")
    row = conn.execute("SELECT title, like_count, like_count_source FROM products WHERE booth_item_id=42").fetchone()
    assert tuple(row) == (None, None, None)  # unknown, not empty/zero

    raw = json.dumps({"id": 42, "name": "T", "description": "推奨人数：1PL\nBGM：なし",
                      "variations": [{"id": 7, "name": "本編PDF", "price": 500, "status": "on_sale"}]})
    rec = parse_item_json(raw, 42)
    store.save_detail(conn, rec, "2026-10-21T00:01:00+00:00", raw)
    store.save_detail(conn, rec, "2026-10-21T00:02:00+00:00", raw)  # idempotent on variant id
    assert conn.execute("SELECT COUNT(*) FROM product_variants WHERE booth_item_id=42").fetchone()[0] == 1
    for h in extract_all(rec.description_text):
        store.save_evidence(conn, 42, h)
    cov = coverage(conn)
    assert cov["detail_fetched"] == 1 and cov["like_count_source"] == {"UNAVAILABLE": 1}
    assert cov["evidence_rows"] == 2 and cov["crawl_queue"] == {"PARSED": 1}
