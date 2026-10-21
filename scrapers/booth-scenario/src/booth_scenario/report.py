"""Field coverage and error summary over the local DB."""
from __future__ import annotations

FIELDS = ["title", "publisher_id", "category_name", "description_text", "language", "like_count", "detail_fetched_at"]


def coverage(conn) -> dict:
    total = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    fetched = conn.execute("SELECT COUNT(*) FROM products WHERE detail_fetched_at IS NOT NULL").fetchone()[0]
    fields = {}
    for f in FIELDS:
        n = conn.execute(f"SELECT COUNT(*) FROM products WHERE {f} IS NOT NULL").fetchone()[0]
        fields[f] = {"non_null": n, "of_products": total}
    like_sources = dict(conn.execute("SELECT COALESCE(like_count_source,'NULL'), COUNT(*) FROM products GROUP BY 1").fetchall())
    variants = conn.execute(
        "SELECT COUNT(*), SUM(price_jpy IS NULL), SUM(external_variant_id IS NULL), SUM(edition_kind='UNKNOWN') FROM product_variants"
    ).fetchone()
    queue = dict(conn.execute("SELECT state, COUNT(*) FROM crawl_queue GROUP BY state").fetchall())
    errors = [dict(r) for r in conn.execute("SELECT booth_item_id, state, attempt_count, last_error FROM crawl_queue WHERE last_error IS NOT NULL")]
    pages = [dict(r) for r in conn.execute("SELECT url, page_number, http_status, card_count, next_page_url FROM crawl_pages")]
    return {
        "products": total,
        "detail_fetched": fetched,
        "fields": fields,
        "like_count_source": like_sources,
        "variants": {"total": variants[0], "price_null": variants[1] or 0, "external_id_null": variants[2] or 0, "edition_unknown": variants[3] or 0},
        "evidence_rows": conn.execute("SELECT COUNT(*) FROM extraction_evidence").fetchone()[0],
        "crawl_queue": queue,
        "crawl_pages": pages,
        "errors": errors,
    }
