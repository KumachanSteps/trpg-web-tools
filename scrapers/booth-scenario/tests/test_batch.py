import json
import random

import pytest

from booth_scenario import batch, organize, review, store
from booth_scenario.rules import default_roles, extract_systems_meta
from test_organize import _item
from test_review_crawl import Site, card, fetcher


def pages_with_pager(last, per_page=8):
    pager = "".join(f'<a href="/en/browse/Tabletop%20RPG?page={n}">{n}</a>' for n in range(1, last + 1))
    return {n: f"<html><body><ul>{''.join(card(n * 100 + i, f'T{n}-{i}', 500) for i in range(per_page))}</ul>"
               f'<div class="pager">{pager}</div></body></html>' for n in range(1, last + 1)}


def test_batch_samples_only_new_products_and_writes_folder(conn, tmp_path):
    pytest.importorskip("openpyxl")
    site = Site(pages_with_pager(4))
    store.ensure_product(conn, 101)
    conn.execute("UPDATE products SET detail_fetched_at='2026-10-01' WHERE booth_item_id=101")  # seen before
    r = batch.run_batch(conn, fetcher(tmp_path, site), tmp_path / "out", scopes=["emoklore"], n=12, seed=1, name="t1")
    assert len(r["items"]) == 12 and 101 not in r["items"]
    pages = [p["page"] for p in r["pages"]]
    assert len(pages) == len(set(pages)) >= 3  # at most PER_PAGE (5) per page, no page twice
    folder = tmp_path / "out" / "batch_t1"
    assert {p.name for p in folder.iterdir()} == {"review_table.xlsx", "batch.json", "booth.sqlite3"}
    meta = json.loads((folder / "batch.json").read_text(encoding="utf-8"))
    assert meta["seed"] == 1 and meta["by_scope"]["emoklore"] == r["items"]
    # Every sampled product was fetched and organized.
    assert conn.execute(f"SELECT COUNT(*) FROM product_classifications WHERE booth_item_id IN ({','.join(map(str, r['items']))})").fetchone()[0] == 12


def test_batch_splits_quota_between_scopes(conn, tmp_path):
    pytest.importorskip("openpyxl")
    site = Site(pages_with_pager(3))
    rng = random.Random(3)
    report = {"pages": []}
    ids = batch.pick_new_items(conn, fetcher(tmp_path, site), ["emoklore", "madamis"], 7, rng, report)
    assert len(report["by_scope"]["emoklore"]) == 4 and len(report["by_scope"]["madamis"]) == 3
    assert len(set(ids)) == 7


def test_madamis_system_and_gm_role():
    hits = extract_systems_meta("【マーダーミステリー】霧の晩餐会", [])
    assert [h.value["system_code"] for h in hits] == ["MADAMIS"]
    v = default_roles({"mode": "MULTI_PL", "facilitator_role": "UNKNOWN", "companion_role": "UNKNOWN"}, {"MADAMIS"})
    assert v["facilitator_role"] == "GM" and v["companion_role"] == "NONE"


def test_madamis_scenario_stored(conn):
    _item(conn, 5, "【マダミス】霧の晩餐会", "プレイ人数：4人", [("PDF", 2000)])
    organize.organize_all(conn)
    assert conn.execute("SELECT system_primary FROM scenarios").fetchone()[0] == "MADAMIS"


def test_system_falls_back_to_query_tag(conn, tmp_path):
    # Neither title, text nor tags name a system: the query that found it does.
    site = Site(pages_with_pager(1, per_page=1))
    batch._fetch_page(conn, fetcher(tmp_path, site), "Tabletop RPG", "エモクロアTRPG", 1)
    _item(conn, 100, "霧の館", "タイマンシナリオ。推奨人数：1PL", [("PDF", 500)])
    organize.organize_all(conn)
    sid = conn.execute("SELECT scenario_id FROM product_scenarios WHERE booth_item_id=100").fetchone()[0]
    assert conn.execute("SELECT system_primary FROM scenarios WHERE scenario_id=?", (sid,)).fetchone()[0] == "EMOKLORE"


def test_price_secret_and_duration_tolerance():
    assert review._matches("price", "1000", "1,000円")
    assert review._matches("price", "0", "無料")
    assert not review._matches("price", "500-1000", "500")
    assert review._matches("durations", "VOICE MAIN 180-240", "VOICE MAIN 120-180")  # within an hour
    assert not review._matches("durations", "VOICE MAIN 180-240", "VOICE MAIN 60-120")
    assert not review._matches("durations", "VOICE MAIN 180-", "VOICE MAIN 180-240")


def test_evaluate_precision_coverage_and_split(conn, tmp_path):
    _item(conn, 1, "霧の館", "推奨人数：1PL\nボイセ3時間", [("PDF", 500)])
    _item(conn, 2, "霧の夜", "これはシナリオです", [("PDF", 900)])
    organize.organize_all(conn)
    out = tmp_path / "r.csv"
    review.export_review(conn, [1, 2], out)
    rows = review._read_rows(out)
    assert {r["auto_price"] for r in rows} == {"500", "900"} and {r["auto_secret_ho"] for r in rows} == {"no"}
    # Item 2 has a play time the rules missed.
    for r in rows:
        if r["booth_item_id"] == "2":
            r["ok_durations"] = "VOICE MAIN 180-240"
    import csv
    raw = list(csv.reader(out.open(encoding="utf-8-sig")))
    with out.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerows(raw[:3])
        w.writerows([[r[k] for k in raw[2]] for r in rows])
    review.import_review(conn, out, batch="b1", split="test")
    sm = review.evaluate(conn, split="TEST")["durations"]
    assert (sm["accuracy"], sm["precision"], sm["coverage"]) == (0.5, 1.0, 0.5)
    assert sm["misses"][0]["kind"] == "empty"
    assert review.evaluate(conn, split="TRAIN")["session_modes"]["checked"] == 0
    assert review.set_split(conn, "b1", "train") == 2
    assert review.evaluate(conn, split="TRAIN")["session_modes"]["checked"] == 2


def test_batch_that_stops_at_once_still_writes_folder(conn, tmp_path):
    class Down:
        def __call__(self, url, timeout):
            import urllib.error
            raise urllib.error.URLError("[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed")
    r = batch.run_batch(conn, fetcher(tmp_path, Down()), tmp_path / "out", scopes=["madamis"], n=3, seed=1, name="t0")
    assert r["items"] == [] and "CERTIFICATE_VERIFY_FAILED" in r["stopped"] and "Install Certificates" in r["hint"]
    assert (tmp_path / "out" / "batch_t0" / "batch.json").exists()


def test_empty_review_table(conn, tmp_path):
    pytest.importorskip("openpyxl")
    assert review.export_review(conn, [], tmp_path / "r.xlsx") == 0


def test_none_words_read_as_empty():
    for w in ("N/A", "n/a", "NONE", "NOT AVAILABLE", "なし", "NONE;"):
        assert review._NONE_WORDS.fullmatch(w)
    assert not review._NONE_WORDS.fullmatch("NONE/NONE")
