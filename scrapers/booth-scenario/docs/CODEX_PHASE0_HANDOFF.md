# Codex Handoff — BOOTH Scraper Phase 0: Metadata Schema Baseline

Use `SCHEMA_SPEC.md` and `schema.sql` as the starting logical model. These are **proposed** models, not evidence of live HTML behavior.

## First deliverable

1. Create an isolated Python package with SQLite storage using `schema.sql` and migrations.
2. Implement public-page probes for two category pages (`Tabletop RPG`, `Tabletop Games`) on at most two pages each. Capture card counts, item IDs, prices, categories, shops, pagination and like count if available.
3. Probe up to ten product detail pages, chosen to cover normal product, same-page variants, separate-product bundle, anthology, samples and different systems. Capture actual HTML snapshots for repeatable offline fixtures where permitted.
4. Record CSS selectors discovered from the live page; no fabricated selectors. Compare static HTML and browser-rendered DOM only when needed.
5. Implement parser tests against offline fixtures and synthetic edge cases, with explicit evidence snippets and nullable unknowns.
6. Produce coverage and error reports. Do not attempt full-scale crawling in Phase 0.

## Target category URLs

- `https://booth.pm/en/browse/Tabletop%20RPG?in_stock=true&tags%5B%5D=%E3%82%AF%E3%83%88%E3%82%A5%E3%83%AB%E3%83%95%E7%A5%9E%E8%A9%B1TRPG`
- `https://booth.pm/en/browse/Tabletop%20Games?in_stock=true&tags%5B%5D=%E3%82%AF%E3%83%88%E3%82%A5%E3%83%AB%E3%83%95%E7%A5%9E%E8%A9%B1TRPG`

## Sample IDs to preserve as tests

CoC-centered (12): 3403696, 1712065, 3408537, 3790708, 1710879, 2907962, 3083345, 3827548, 647539, 3251000, 2625282, 3954297.
Emoklore (9): 3846658, 5426186, 3645142, 3214445, 4675060, 6860713, 3790300, 5989929, 3557484.
Collections (6): 4604659, 590976, 958529, 6407066, 8493819, 4946326.

## Safety and traffic requirements

Sequential requests, configurable delay (initial testing configuration 8 seconds), caching and backoff. Honor site rules and disallow evasion; stop for CAPTCHA/403/repeated 429. Probe only public product metadata and description; do not download downloadable product assets or authenticate.

## Specific unresolved questions

- Are likes rendered per search card, detail page, or public structured data?
- Are product variants present in initial HTML? Can they be reliably mapped by variant ID?
- Are category URL pagination links stable and what is the actual card count per page?
- Are product image alt text and SEO snippets reliable or merely fallbacks?
- What DOM element precisely bounds the main item description, excluding recommendations?

Report unverified findings explicitly and leave the relevant schema values NULL.
