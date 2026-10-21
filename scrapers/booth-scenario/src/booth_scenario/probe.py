"""Phase 0 probes: two category listings x <=2 pages, <=10 detail pages.
Hard caps are enforced here, not just in the CLI defaults."""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from . import store, targets
from .fetcher import PoliteFetcher, Refused, StopCrawl
from .parsers.detail import parse_detail_html, parse_item_json
from .parsers.listing import parse_listing
from .rules import extract_all

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
        entry: dict = {"booth_item_id": iid}
        try:
            r = fetcher.fetch(targets.item_page_url(iid))
            entry["html_status"] = r.status
            if r.status == 200:
                (snapshot_dir / f"item_{iid}.html").write_text(r.body, encoding="utf-8")
                html_rec = parse_detail_html(r.body, iid, r.url)
                entry["html"] = {k: v for k, v in asdict(html_rec).items() if k not in ("description_text",)}
                store.save_detail(conn, html_rec, r.fetched_at, r.body)
            elif r.status == 404:
                store.mark_error(conn, iid, "404 on product page", "SKIPPED")
            if with_json and r.status == 200:
                j = fetcher.fetch(targets.item_json_url(iid))
                entry["json_status"] = j.status
                entry["json_content_type"] = j.content_type
                if j.status == 200:
                    (snapshot_dir / f"item_{iid}.json").write_text(j.body, encoding="utf-8")
                    try:
                        jrec = parse_item_json(j.body, iid)
                    except ValueError as e:
                        entry["json_error"] = str(e)
                    else:
                        entry["json"] = {
                            "present_keys": jrec.present_keys, "title": jrec.title, "shop": jrec.shop_name,
                            "category_path": jrec.category_path, "like_count": jrec.like_count,
                            "listing_status": jrec.listing_status, "tags": jrec.tags[:15],
                            "variants": [asdict(v) for v in jrec.variants],
                            "description_chars": len(jrec.description_text or ""),
                        }
                        store.save_detail(conn, jrec, j.fetched_at, j.body)
                        hits = extract_all(jrec.description_text or "")
                        for h in hits:
                            store.save_evidence(conn, iid, h)
                        conn.commit()
                        entry["rule_hits"] = [{"field": h.field_path, "value": h.value, "excerpt": h.excerpt[:80]} for h in hits]
        except Refused as e:
            entry["error"] = f"Refused: {e}"
            report["errors"].append(entry["error"])
        except StopCrawl as e:
            entry["error"] = f"StopCrawl: {e}"
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
