import csv
import json

import pytest

from booth_scenario import crawl, organize, review, store
from booth_scenario.fetcher import PoliteFetcher
from test_organize import _item


def test_review_roundtrip_and_evaluate(conn, tmp_path):
    _item(conn, 1, "霧の館", "推奨人数：1PL", [("PDF", 500)])
    _item(conn, 2, "霧の夜", "これはシナリオです", [("PDF", 900)])
    organize.organize_all(conn)
    out = tmp_path / "r.csv"
    assert review.export_review(conn, [1, 2], out) == 2
    raw = list(csv.reader(out.open(encoding="utf-8-sig")))
    assert raw[1][0] == "#説明" and raw[2][1] == "booth_item_id"
    rows = review._read_rows(out)
    assert rows[0]["auto_session_modes"] == "SOLO 1-1 UNKNOWN/NONE"
    # Reviewer: item 2 is an anthology of two works; item 1 is right as is.
    rows[1]["ok_product_kind"] = "COLLECTION"
    rows[1]["ok_members"] = "A／B"
    with out.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerows(raw[:3])
        w.writerows([[r[k] for k in raw[2]] for r in rows])
    assert review.import_review(conn, out) == {"imported": 2, "corrected_cells": 2}
    organize.organize_item(conn, 2)
    assert conn.execute("SELECT product_kind, method FROM product_classifications WHERE booth_item_id=2").fetchone()[:] == ("COLLECTION", "MANUAL")
    ev = review.evaluate(conn)
    assert ev["product_kind"]["correct"] == 1 and ev["product_kind"]["checked"] == 2
    assert ev["session_modes"]["accuracy"] == 1.0


def test_review_xlsx_roundtrip(conn, tmp_path):
    openpyxl = pytest.importorskip("openpyxl")
    _item(conn, 1, "霧の館", "推奨人数：1PL", [("PDF", 500)])
    organize.organize_all(conn)
    out = tmp_path / "r.xlsx"
    assert review.export_review(conn, [1], out) == 1
    wb = openpyxl.load_workbook(out)
    ws = wb["review"]
    keys = [c.value for c in ws[3]]
    ws.cell(4, keys.index("ok_product_kind") + 1, "COLLECTION")
    ws.cell(4, keys.index("ok_members") + 1, "A／B")
    wb.save(out)
    assert review.import_review(conn, out) == {"imported": 1, "corrected_cells": 2}
    assert conn.execute("SELECT product_kind, method FROM product_classifications WHERE booth_item_id=1").fetchone()[:] == ("COLLECTION", "MANUAL")


def test_pick_review_set_starts_with_samples(conn):
    for i in range(100, 160):
        store.ensure_product(conn, i)
        conn.execute("UPDATE products SET listing_title=?, listing_price_jpy=? WHERE booth_item_id=?", ("アンソロジー" if i < 105 else "x", 0 if i % 7 == 0 else 500, i))
    ids = review.pick_review_set(conn, 50)
    assert len(ids) == 50 and ids[0] == 3403696 and len(set(ids)) == 50
    assert {100, 101, 102, 103, 104} <= set(ids)


# -- crawling with a fake site ------------------------------------------------------
def card(iid, name, price):
    return f'<li class="item-card" data-product-id="{iid}" data-product-name="{name}"><a href="https://booth.pm/ja/items/{iid}">x</a><div class="item-card__summary"><div class="price">{price} JPY</div></div></li>'


class Site:
    def __init__(self, pages):
        self.pages = pages  # page number -> html
        self.calls = []

    def __call__(self, url, timeout):
        self.calls.append(url)
        if url.endswith("robots.txt"):
            return 200, "text/plain", b""
        if "/items/" in url:
            iid = int(url.rsplit("/", 1)[1].split(".")[0])
            if url.endswith(".json") and iid == 998:
                return 503, "application/json", b"busy"
            if url.endswith(".json"):
                return 200, "application/json", json.dumps({"id": iid, "name": f"T{iid}", "variations": [{"id": 1, "name": "PDF", "price": 100, "status": "addable_to_cart"}]}).encode()
            if iid == 999:
                return 500, "text/html", b"oops"
            return 200, "text/html", b"<html><body>ok</body></html>"
        n = int(url.split("page=")[1]) if "page=" in url else 1
        return 200, "text/html", self.pages[n].encode()


def listing_page(n, last, cards):
    nxt = f'<div class="pager"><a rel="next" href="/en/browse/Tabletop%20RPG?page={n + 1}">next</a></div>' if n < last else ""
    return f"<html><body><ul>{''.join(cards)}</ul>{nxt}</body></html>"


def fetcher(tmp_path, site):
    return PoliteFetcher(tmp_path / "cache", delay=0, opener=site, sleep=lambda s: None)


def test_listing_resumes_and_requeues_changes(conn, tmp_path):
    pages = {1: listing_page(1, 3, [card(1, "A", 100)]), 2: listing_page(2, 3, [card(2, "B", 200)]), 3: listing_page(3, 3, [card(3, "C", 300)])}
    site = Site(pages)
    base = "https://booth.pm/en/browse/Tabletop%20RPG?in_stock=true"
    r1 = crawl.crawl_listing(conn, fetcher(tmp_path, site), "Tabletop RPG", max_pages=2, base_url=base)
    assert r1["pages"] == 2 and r1["last_page"] == 2 and not r1.get("completed")
    r2 = crawl.crawl_listing(conn, fetcher(tmp_path, site), "Tabletop RPG", max_pages=5, base_url=base)
    assert r2["started_page"] == 3 and r2["completed"] and r2["new_items"] == 1
    conn.execute("UPDATE crawl_queue SET state='PARSED'")
    site.pages[1] = listing_page(1, 3, [card(1, "A", 150)])  # price changed
    r3 = crawl.crawl_listing(conn, fetcher(tmp_path, site), "Tabletop RPG", max_pages=1, base_url=base)
    assert r3["started_page"] == 1 and r3["requeued"] == 1
    assert conn.execute("SELECT state FROM crawl_queue WHERE booth_item_id=1").fetchone()[0] == "QUEUED"


def test_crawl_details_limits_retries_and_recovers(conn, tmp_path):
    for i in (1, 2, 998, 999):
        store.ensure_product(conn, i)
    conn.execute("UPDATE crawl_queue SET state='FETCHING' WHERE booth_item_id=2")  # died mid-item last run
    site = Site({})
    r = crawl.crawl_details(conn, fetcher(tmp_path, site), limit=10)
    assert r["done"] == 2 and r["errors"] == 2
    states = dict(conn.execute("SELECT booth_item_id, state FROM crawl_queue").fetchall())
    # A page that loads but whose JSON fails is retried, not taken as complete.
    assert states == {1: "PARSED", 2: "PARSED", 998: "RETRY", 999: "RETRY"}
    # RETRY is not due yet, so a second run does nothing.
    assert crawl.crawl_details(conn, fetcher(tmp_path, site), limit=10)["done"] == 0
    assert conn.execute("SELECT title FROM products WHERE booth_item_id=1").fetchone()[0] == "T1"
