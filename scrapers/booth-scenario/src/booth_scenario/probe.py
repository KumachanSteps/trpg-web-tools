"""Phase 0 probes: two category listings x <=2 pages, <=10 detail pages.
Hard caps are enforced here, not just in the CLI defaults."""
from __future__ import annotations

import json
from pathlib import Path

from . import store, targets
from .fetcher import PoliteFetcher, Refused, StopCrawl
from .crawl import fetch_item
from .parsers.listing import parse_listing

MAX_LISTING_PAGES = 2
MAX_DETAIL_ITEMS = 10


def _with_page(url: str, n: int) -> str:
    return url if n == 1 else f"{url}&page={n}"


def probe_listings(conn, fetcher: PoliteFetcher, snapshot_dir: Path, pages: int = 2) -> dict:
    pages = min(pages, MAX_LISTING_PAGES)
    report: dict = {"listings": [], "errors": []}
    for name, base in targets.CATEGORY_URLS.items():
        qid = store.ensure_search_query(conn, name, targets.COC_TAG, True)
        url = base
        for n in range(1, pages + 1):
            try:
                r = fetcher.fetch(url)
            except (Refused, StopCrawl) as e:
                report["errors"].append({"url": url, "error": f"{type(e).__name__}: {e}"})
                if isinstance(e, StopCrawl):
                    report["stopped"] = str(e)
                    return report
                break
            (snapshot_dir / f"listing_{name.replace(' ', '_')}_p{n}.html").write_text(r.body, encoding="utf-8")
            page = parse_listing(r.body, url, current_page=n)
            store.save_listing(conn, qid, n, page, r.status, r.fetched_at)
            report["listings"].append({
                "category": name, "page": n, "url": url, "status": r.status, "from_cache": r.from_cache,
                "method": page.method, "card_count": page.card_count, "item_ids_from_links": len(page.item_ids_from_links),
                "first_ids": page.item_ids_from_links[:10], "page_numbers_seen": page.page_numbers[:20],
                "next_page_url": page.next_page_url, "notes": page.notes,
            })
            url = page.next_page_url or _with_page(base, n + 1)
    return report


def probe_details(conn, fetcher: PoliteFetcher, snapshot_dir: Path, ids: list[int] | None = None, with_json: bool = True) -> dict:
    ids = (ids or targets.DEFAULT_DETAIL_PROBE)[:MAX_DETAIL_ITEMS]
    report: dict = {"details": [], "errors": []}
    for iid in ids:
        try:
            entry = fetch_item(conn, fetcher, iid, snapshot_dir=snapshot_dir, with_json=with_json)
        except (Refused, RuntimeError) as e:
            entry = {"booth_item_id": iid, "error": f"{type(e).__name__}: {e}"}
            report["errors"].append(entry["error"])
        except StopCrawl as e:
            entry = {"booth_item_id": iid, "error": f"StopCrawl: {e}"}
            report["errors"].append(entry["error"])
            report["stopped"] = str(e)
            report["details"].append(entry)
            break
        report["details"].append(entry)
    return report


def write_report(conn, probe_results: dict, out_dir: Path) -> Path:
    from .report import coverage

    out_dir.mkdir(parents=True, exist_ok=True)
    data = {"probe": probe_results, "coverage": coverage(conn)}
    p = out_dir / "phase0_report.json"
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return p
