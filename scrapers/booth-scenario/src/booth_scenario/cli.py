"""python -m booth_scenario <command>"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import db, discover, probe, store
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
    ec = sub.add_parser("export-catalog", help="write catalog/v1 JSON for the web tools")
    ec.add_argument("--out", type=Path, help="output folder (default: <data-dir>/catalog/v1)")
    lf = sub.add_parser("load-fixture")
    lf.add_argument("path", type=Path)
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
    if args.cmd == "export-catalog":
        from .catalog import export_catalog

        out = args.out or data / "catalog" / "v1"
        manifest = export_catalog(conn, out)
        print(f"exported {manifest['counts']['scenarios']} scenarios to {out} (version {manifest['version']})")
        return 0
    if args.cmd == "load-fixture":
        store.load_synthetic_fixture(conn, json.loads(args.path.read_text(encoding="utf-8")))
        print("loaded")
        return 0
    return 1
