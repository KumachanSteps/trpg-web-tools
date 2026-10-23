"""Resumable, incremental crawling (Phase 1).

Listing pass: walks every page of a category query, remembering the last page
done in `listing_progress`, so an interrupted pass resumes where it stopped.
New item IDs enter `crawl_queue` as DISCOVERED; items whose card title/price
changed are re-queued (see store._note_listing_card).

Detail pass: takes items from `crawl_queue` (DISCOVERED, QUEUED, due RETRY),
fetches the HTML page and the item JSON, and stores both. Bounded per run by
item count and minutes. The fetcher's safety rules (delay, robots, stop on
403/challenge/429) apply unchanged; a StopCrawl ends the run immediately.
"""
from __future__ import annotations

import time
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import store, targets
from .db import utcnow
from .fetcher import PoliteFetcher, Refused, StopCrawl
from .parsers.detail import parse_detail_html, parse_item_json
from .parsers.listing import parse_listing
from .evidence import rebuild_evidence

MAX_ATTEMPTS = 3


def fetch_item(conn, fetcher: PoliteFetcher, iid: int, *, use_cache: bool = True, store_cache: bool = True,
               snapshot_dir: Path | None = None, with_json: bool = True) -> dict:
    """Fetch and store one product (HTML page + item JSON). Returns a report entry.
    Raises StopCrawl/Refused to the caller."""
    entry: dict = {"booth_item_id": iid}
    r = fetcher.fetch(targets.item_page_url(iid), use_cache=use_cache, store_cache=store_cache)
    entry["html_status"] = r.status
    if r.status == 404:
        store.mark_error(conn, iid, "404 on product page", "SKIPPED")
        return entry
    if r.status != 200:
        raise RuntimeError(f"HTTP {r.status} on product page")
    if snapshot_dir:
        (snapshot_dir / f"item_{iid}.html").write_text(r.body, encoding="utf-8")
    html_rec = parse_detail_html(r.body, iid, r.url)
    entry["html"] = {k: v for k, v in asdict(html_rec).items() if k not in ("description_text",)}
    store.save_detail(conn, html_rec, r.fetched_at, r.body)
    if not with_json:
        return entry

    j = fetcher.fetch(targets.item_json_url(iid), use_cache=use_cache, store_cache=store_cache)
    entry["json_status"] = j.status
    entry["json_content_type"] = j.content_type
    # A missing or broken JSON leaves the item incomplete: let the caller retry it.
    if j.status != 200:
        raise RuntimeError(f"HTTP {j.status} on item JSON")
    if snapshot_dir:
        (snapshot_dir / f"item_{iid}.json").write_text(j.body, encoding="utf-8")
    try:
        jrec = parse_item_json(j.body, iid)
    except ValueError as e:
        raise RuntimeError(f"bad item JSON: {e}") from e
    entry["json"] = {
        "present_keys": jrec.present_keys, "title": jrec.title, "shop": jrec.shop_name,
        "category_path": jrec.category_path, "like_count": jrec.like_count,
        "listing_status": jrec.listing_status, "tags": jrec.tags[:15],
        "variants": [asdict(v) for v in jrec.variants],
        "description_chars": len(jrec.description_text or ""),
        "html_description_chars": len(html_rec.description_text or ""),
    }
    # JSON description lacks the shop's extra sections, where system,
    # player count and play time often are; keep the HTML text if any.
    if html_rec.description_text:
        jrec.description_text = None
    store.save_detail(conn, jrec, j.fetched_at, j.body)
    # Evidence is regenerated per fetch so it always matches the stored text.
    rebuild_evidence(conn, iid)
    hits = conn.execute("SELECT field_path, raw_excerpt FROM extraction_evidence WHERE booth_item_id=?", (iid,)).fetchall()
    entry["rule_hits"] = [{"field": h["field_path"], "excerpt": h["raw_excerpt"][:80]} for h in hits]
    return entry


def _with_page(url: str, n: int) -> str:
    return url if n == 1 else f"{url}&page={n}"


def crawl_listing(conn, fetcher: PoliteFetcher, category: str, *, max_pages: int, restart: bool = False,
                  tag: str = targets.COC_TAG, base_url: str | None = None) -> dict:
    base = base_url or targets.CATEGORY_URLS[category]
    qid = store.ensure_search_query(conn, category, tag, True)
    prog = conn.execute("SELECT * FROM listing_progress WHERE search_query_id=?", (qid,)).fetchone()
    if prog is None or restart or prog["completed_at"]:
        conn.execute(
            "INSERT OR REPLACE INTO listing_progress (search_query_id, pass_started_at, last_page, next_page_url) VALUES (?, ?, 0, ?)",
            (qid, utcnow(), base),
        )
        conn.commit()
        prog = conn.execute("SELECT * FROM listing_progress WHERE search_query_id=?", (qid,)).fetchone()
    page_no, url = prog["last_page"] + 1, prog["next_page_url"] or _with_page(base, prog["last_page"] + 1)
    report: dict = {"category": category, "started_page": page_no, "pages": 0, "new_items": 0, "requeued": 0}
    for _ in range(max_pages):
        before = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        queued_before = conn.execute("SELECT COUNT(*) FROM crawl_queue WHERE state='QUEUED'").fetchone()[0]
        r = fetcher.fetch(url, use_cache=False, store_cache=False)
        if r.status != 200:
            report["error"] = f"HTTP {r.status} on {url}"
            break
        page = parse_listing(r.body, url, current_page=page_no)
        store.save_listing(conn, qid, page_no, page, r.status, r.fetched_at)
        report["pages"] += 1
        report["new_items"] += conn.execute("SELECT COUNT(*) FROM products").fetchone()[0] - before
        report["requeued"] += conn.execute("SELECT COUNT(*) FROM crawl_queue WHERE state='QUEUED'").fetchone()[0] - queued_before
        done = not page.next_page_url or not page.cards
        conn.execute(
            "UPDATE listing_progress SET last_page=?, last_page_url=?, next_page_url=?, completed_at=? WHERE search_query_id=?",
            (page_no, url, page.next_page_url, utcnow() if done else None, qid),
        )
        conn.commit()
        if done:
            report["completed"] = True
            break
        page_no, url = page_no + 1, page.next_page_url
    report["last_page"] = conn.execute("SELECT last_page FROM listing_progress WHERE search_query_id=?", (qid,)).fetchone()[0]
    return report


def requeue_stale(conn, older_than_days: float) -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=older_than_days)).replace(microsecond=0).isoformat()
    cur = conn.execute(
        """UPDATE crawl_queue SET state='QUEUED', next_attempt_at=NULL, updated_at=?
           WHERE state='PARSED' AND booth_item_id IN (SELECT booth_item_id FROM products WHERE detail_fetched_at < ?)""",
        (utcnow(), cutoff),
    )
    conn.commit()
    return cur.rowcount


def _next_items(conn, limit: int) -> list:
    now = utcnow()
    return conn.execute(
        """SELECT booth_item_id, state, attempt_count FROM crawl_queue
           WHERE state IN ('DISCOVERED','QUEUED') OR (state='RETRY' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
           ORDER BY CASE state WHEN 'QUEUED' THEN 0 WHEN 'DISCOVERED' THEN 1 ELSE 2 END, updated_at, booth_item_id
           LIMIT ?""",
        (now, limit),
    ).fetchall()


def crawl_details(conn, fetcher: PoliteFetcher, *, limit: int, max_minutes: float | None = None,
                  clock=time.monotonic) -> dict:
    # A previous run that died mid-item leaves FETCHING rows; put them back.
    conn.execute("UPDATE crawl_queue SET state='QUEUED' WHERE state='FETCHING'")
    conn.commit()
    started = clock()
    report: dict = {"done": 0, "errors": 0, "skipped": 0}
    for row in _next_items(conn, limit):
        if max_minutes is not None and clock() - started > max_minutes * 60:
            report["time_limit"] = True
            break
        iid, refetch = row["booth_item_id"], row["state"] == "QUEUED"
        conn.execute("UPDATE crawl_queue SET state='FETCHING', updated_at=? WHERE booth_item_id=?", (utcnow(), iid))
        conn.commit()
        try:
            entry = fetch_item(conn, fetcher, iid, use_cache=not refetch, store_cache=False)
            if entry.get("html_status") == 404:
                report["skipped"] += 1
            else:
                report["done"] += 1
        except StopCrawl as e:
            conn.execute("UPDATE crawl_queue SET state='QUEUED', updated_at=? WHERE booth_item_id=?", (utcnow(), iid))
            conn.commit()
            report["stopped"] = str(e)
            break
        except (Refused, RuntimeError, ValueError) as e:
            attempts = row["attempt_count"] + 1
            state = "REVIEW" if attempts >= MAX_ATTEMPTS else "RETRY"
            wait = timedelta(hours=2 ** attempts)
            nxt = (datetime.now(timezone.utc) + wait).replace(microsecond=0).isoformat()
            conn.execute(
                "UPDATE crawl_queue SET state=?, attempt_count=?, last_error=?, next_attempt_at=?, updated_at=? WHERE booth_item_id=?",
                (state, attempts, f"{type(e).__name__}: {e}"[:500], nxt, utcnow(), iid),
            )
            conn.commit()
            report["errors"] += 1
    report["queue"] = dict(conn.execute("SELECT state, COUNT(*) FROM crawl_queue GROUP BY state").fetchall())
    return report
