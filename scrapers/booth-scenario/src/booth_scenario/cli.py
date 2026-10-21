"""python -m booth_scenario <command>"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import crawl, db, discover, organize, probe, review, store, targets
from .report import coverage

DEFAULT_DATA = Path(__file__).resolve().parents[2] / "data"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="booth_scenario")
    ap.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    ap.add_argument("--delay", type=float, default=8.0, help="seconds between network requests (min 3)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init-db")
    pl = sub.add_parser("probe-listing")
    pl.add_argument("--pages", type=int, default=2)
    pd = sub.add_parser("probe-detail")
    pd.add_argument("--ids", type=int, nargs="*")
    pd.add_argument("--no-json", action="store_true")
    sub.add_parser("report")
    ds = sub.add_parser("discover-selectors")
    ds.add_argument("snapshot", type=Path)
    ds.add_argument("--text", help="text known to be on the page")
    lf = sub.add_parser("load-fixture")
    lf.add_argument("path", type=Path)

    cl = sub.add_parser("crawl-listing", help="resumable listing pass over one category")
    cl.add_argument("--category", choices=sorted(targets.CATEGORY_URLS), default="Tabletop RPG")
    cl.add_argument("--max-pages", type=int, default=50)
    cl.add_argument("--restart", action="store_true", help="start a new pass from page 1")
    cd = sub.add_parser("crawl-details", help="fetch queued product pages")
    cd.add_argument("--limit", type=int, default=200)
    cd.add_argument("--max-minutes", type=float, default=60)
    cd.add_argument("--refresh-older-than-days", type=float, help="also requeue items fetched before this many days ago")
    fi = sub.add_parser("fetch-items", help="fetch specific products (max 60)")
    fi.add_argument("--ids", type=int, nargs="*")
    fi.add_argument("--review-set", action="store_true", help="use data/review/review_set.json")
    fi.add_argument("--refetch", action="store_true")

    og = sub.add_parser("organize", help="classify fetched products and build scenario records")
    og.add_argument("--ids", type=int, nargs="*")
    sub.add_parser("apply-links", help="merge CONFIRMED same-work link candidates")
    sub.add_parser("reextract", help="rebuild rule evidence from stored text (no network)")

    ps = sub.add_parser("pick-review-set")
    ps.add_argument("--n", type=int, default=50)
    ex = sub.add_parser("export-review")
    ex.add_argument("--out", type=Path)
    ex.add_argument("--ids", type=int, nargs="*")
    im = sub.add_parser("import-review")
    im.add_argument("path", type=Path)
    sub.add_parser("evaluate")
    args = ap.parse_args(argv)

    data = args.data_dir
    conn = db.connect(data / "booth.sqlite3")
    if args.cmd == "init-db":
        print(f"migrated: {data / 'booth.sqlite3'}")
        return 0
    if args.cmd in ("probe-listing", "probe-detail"):
        from .fetcher import PoliteFetcher

        fetcher = PoliteFetcher(data / "cache", delay=max(args.delay, 3.0))
        snaps = data / "snapshots"
        snaps.mkdir(parents=True, exist_ok=True)
        if args.cmd == "probe-listing":
            result = probe.probe_listings(conn, fetcher, snaps, args.pages)
        else:
            result = probe.probe_details(conn, fetcher, snaps, args.ids, with_json=not args.no_json)
        name = "listing" if args.cmd == "probe-listing" else "detail"
        out = data / "reports" / f"probe_{name}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{fetcher.network_requests} network requests; report: {out}")
        if result.get("stopped"):
            print(f"STOPPED: {result['stopped']}", file=sys.stderr)
            return 2
        return 0
    if args.cmd == "report":
        print(json.dumps(coverage(conn), ensure_ascii=False, indent=2))
        return 0
    if args.cmd == "discover-selectors":
        html = args.snapshot.read_text(encoding="utf-8")
        result = discover.find_text(html, args.text) if args.text else discover.summarize_classes(html)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    review_set_path = data / "review" / "review_set.json"
    if args.cmd in ("crawl-listing", "crawl-details", "fetch-items"):
        from .fetcher import PoliteFetcher, StopCrawl

        fetcher = PoliteFetcher(data / "cache", delay=max(args.delay, 3.0))
        if args.cmd == "crawl-listing":
            try:
                result = crawl.crawl_listing(conn, fetcher, args.category, max_pages=args.max_pages, restart=args.restart)
            except StopCrawl as e:
                result = {"stopped": str(e)}
        elif args.cmd == "crawl-details":
            if args.refresh_older_than_days is not None:
                print(f"requeued stale: {crawl.requeue_stale(conn, args.refresh_older_than_days)}")
            result = crawl.crawl_details(conn, fetcher, limit=args.limit, max_minutes=args.max_minutes)
        else:
            ids = review.load_set(review_set_path) if args.review_set else (args.ids or [])
            result = {"done": [], "errors": []}
            for iid in ids[:60]:
                # Without --refetch, items fetched before are re-read from the cache (no request).
                try:
                    crawl.fetch_item(conn, fetcher, iid, use_cache=not args.refetch)
                    result["done"].append(iid)
                except StopCrawl as e:
                    result["stopped"] = str(e)
                    break
                except Exception as e:  # noqa: BLE001 - report and continue with the next item
                    result["errors"].append({"booth_item_id": iid, "error": f"{type(e).__name__}: {e}"})
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print(f"{fetcher.network_requests} network requests")
        if result.get("stopped"):
            print(f"STOPPED: {result['stopped']}", file=sys.stderr)
            return 2
        return 0
    if args.cmd == "organize":
        if args.ids:
            result = {i: organize.organize_item(conn, i).kind for i in args.ids}
            result["link_candidates_added"] = organize.propose_links(conn)
        else:
            result = organize.organize_all(conn)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    if args.cmd == "reextract":
        from .evidence import rebuild_all

        print(f"evidence rows: {rebuild_all(conn)}")
        return 0
    if args.cmd == "apply-links":
        print(f"merged: {organize.apply_confirmed_links(conn)}")
        return 0
    if args.cmd == "pick-review-set":
        ids = review.pick_review_set(conn, args.n)
        review.save_set(ids, review_set_path)
        print(f"{len(ids)} items -> {review_set_path}")
        return 0
    if args.cmd == "export-review":
        ids = args.ids or review.load_set(review_set_path)
        out = args.out or data / "review" / "review_table.xlsx"
        print(f"{review.export_review(conn, ids, out)} rows -> {out}")
        return 0
    if args.cmd == "import-review":
        print(json.dumps(review.import_review(conn, args.path), ensure_ascii=False))
        return 0
    if args.cmd == "evaluate":
        result = review.evaluate(conn)
        out = data / "reports" / "evaluation.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        for f, st in result.items():
            print(f"{f:15} {st['correct']}/{st['checked']}  {st['accuracy']}")
        print(f"details: {out}")
        return 0
    if args.cmd == "load-fixture":
        store.load_synthetic_fixture(conn, json.loads(args.path.read_text(encoding="utf-8")))
        print("loaded")
        return 0
    return 1
