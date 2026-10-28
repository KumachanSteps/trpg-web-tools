"""Test batches: a small random sample of products never seen before, fetched
and organized, with a review table to check by hand.

Meant to run on a schedule on TK's PC (decided 2026-10-24). Each run splits
the batch evenly between the scopes, picks random listing pages of each
scope's queries (weighted by their page counts), takes a few unseen products
from each page, fetches them politely, and writes a batch folder:

  batch_<name>/review_table.xlsx   the review table (check and send back)
  batch_<name>/batch.json          what was sampled and how
  batch_<name>/booth.sqlite3       a copy of the database for scoring

Checked tables are imported with `import-review --batch <name> --split test`,
so the score measures the rules on products they were not tuned on.
"""
from __future__ import annotations

import json
import random
import sqlite3
from datetime import datetime
from pathlib import Path

from . import organize, review, store, targets
from .crawl import _with_page, fetch_item
from .db import utcnow
from .fetcher import PoliteFetcher, StopCrawl
from .parsers.listing import parse_listing

PER_PAGE = 5  # at most this many products from one listing page, to spread the sample
MAX_PAGES = 40


def _seen(conn) -> set[int]:
    """Products already fetched or reviewed: a test batch only takes new ones."""
    fetched = {r[0] for r in conn.execute("SELECT booth_item_id FROM products WHERE detail_fetched_at IS NOT NULL")}
    return fetched | review.reviewed_ids(conn)


def _fetch_page(conn, fetcher, category: str, tag: str, page_no: int):
    url = _with_page(targets.browse_url(category, tag), page_no)
    r = fetcher.fetch(url, use_cache=False, store_cache=False)
    if r.status != 200:
        raise RuntimeError(f"HTTP {r.status} on {url}")
    page = parse_listing(r.body, url, current_page=page_no)
    store.save_listing(conn, store.ensure_search_query(conn, category, tag, True), page_no, page, r.status, r.fetched_at)
    return page


def pick_new_items(conn, fetcher: PoliteFetcher, scopes: list[str], n: int, rng: random.Random, report: dict) -> list[int]:
    """Sample up to n unseen products, split evenly between the scopes so a
    small scope (murder mysteries) gets enough items to score. Within a scope,
    pages are drawn in proportion to each query's page count."""
    seen = _seen(conn)
    chosen: list[int] = []
    report.setdefault("query_pages", {})
    report.setdefault("by_scope", {})
    quotas = [n // len(scopes) + (i < n % len(scopes)) for i in range(len(scopes))]
    for scope, quota in zip(scopes, quotas):
        queries = targets.SCOPE_QUERIES[scope]
        last_page: dict[tuple[str, str], int] = {}
        pages_seen: set[tuple[str, str, int]] = set()
        mine: list[int] = []

        def take(q, page_no, page):
            pages_seen.add((*q, page_no))
            report["pages"].append({"scope": scope, "category": q[0], "tag": q[1], "page": page_no})
            fresh = [c.booth_item_id for c in page.cards if c.booth_item_id not in seen and c.booth_item_id not in chosen + mine]
            rng.shuffle(fresh)
            mine.extend(fresh[:min(PER_PAGE, quota - len(mine))])

        # Page 1 of each query tells how many pages it has.
        for q in queries:
            page = _fetch_page(conn, fetcher, *q, 1)
            last_page[q] = max(page.page_numbers or [1])
            report["query_pages"][f"{q[0]} / {q[1]}"] = last_page[q]
            take(q, 1, page)
        total = sum(last_page.values())
        while len(mine) < quota and len(pages_seen) < min(total, MAX_PAGES):
            q = rng.choices(queries, weights=[last_page[q] for q in queries])[0]
            page_no = rng.randint(1, last_page[q])
            if (*q, page_no) not in pages_seen:
                take(q, page_no, _fetch_page(conn, fetcher, *q, page_no))
        report["by_scope"][scope] = mine[:quota]
        chosen += mine[:quota]
    return chosen


def _copy_db(conn, path: Path) -> None:
    dest = sqlite3.connect(str(path))
    with dest:
        conn.backup(dest)
    dest.close()


def run_batch(conn, fetcher: PoliteFetcher, out_root: Path, *, scopes: list[str], n: int = 50,
              seed: int | None = None, name: str | None = None) -> dict:
    """Sample, fetch and organize n new products; write the batch folder.
    A StopCrawl (403, challenge, repeated 429) ends the run early, and the
    folder still holds what was fetched up to then."""
    name = name or datetime.now().strftime("%Y%m%d-%H%M")
    seed = seed if seed is not None else random.SystemRandom().randrange(2**31)
    rng = random.Random(seed)
    out = out_root / f"batch_{name}"
    out.mkdir(parents=True, exist_ok=True)
    report: dict = {"batch": name, "scopes": scopes, "seed": seed, "started_at": utcnow(), "pages": [], "errors": []}
    ids: list[int] = []
    try:
        ids = pick_new_items(conn, fetcher, scopes, n, rng, report)
        done = []
        for iid in ids:
            try:
                fetch_item(conn, fetcher, iid, use_cache=False, store_cache=False)
                done.append(iid)
            except StopCrawl:
                raise
            except Exception as e:  # noqa: BLE001 - note it and go on with the next product
                report["errors"].append({"booth_item_id": iid, "error": f"{type(e).__name__}: {e}"})
        ids = done
    except StopCrawl as e:
        report["stopped"] = str(e)
        ids = [i for i in ids if conn.execute(
            "SELECT 1 FROM products WHERE booth_item_id=? AND detail_fetched_at IS NOT NULL", (i,)).fetchone()]
    for iid in ids:
        organize.organize_item(conn, iid)
    organize.propose_links(conn)
    conn.commit()
    report["items"] = ids
    report["network_requests"] = fetcher.network_requests
    report["finished_at"] = utcnow()
    if "CERTIFICATE_VERIFY_FAILED" in report.get("stopped", ""):
        # python.org's Python on macOS ships without root certificates.
        report["hint"] = "macOS: run /Applications/Python 3.x/Install Certificates.command once, then try again"
    (out / "batch.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if ids:
        review.export_review(conn, ids, out / "review_table.xlsx")
    _copy_db(conn, out / "booth.sqlite3")
    report["folder"] = str(out)
    return report
