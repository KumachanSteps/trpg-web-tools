# BOOTH Scenario Scraper — Phase 0 Metadata Schema v1.0

Status: **Proposed for implementation / not a verified BOOTH DOM schema**. Date: 2026-10-14.

## Purpose

Collect publicly visible BOOTH product information while maintaining independent canonical TRPG scenario records. One product may include many scenarios; the same scenario may be available via several products, variants or external URLs. A purchaser's private acquisition records are kept separately from public catalog facts.

## Core model

- `products`: one record per BOOTH item ID (public listing, snapshot fields, like count and extraction status).
- `product_variants`: a page may offer the full scenario, one member scenario, a collection, a sample, physical book or assets. BOOTH variant ID may be missing from public markup; allocate a stable internal `variant_id` and reconcile by item ID + normalized label only as provisional.
- `scenarios`: canonical works with stable local `scenario_id`. Do not derive IDs by name or item ID.
- `scenario_systems`: separate native support, explicitly supported editions, conversion patches, and author-described convertibility.
- `collections`: grouping of works. `collection_scenarios` maps membership and order. `product_collections` maps BOOTH pages to collections; a collection may appear on more than one page.
- `product_scenarios`: a BOOTH page can describe a standalone work or contain several works.
- `variant_scenarios`: verify coverage **per purchasable variant**, so a sample never implies full ownership.
- `scenario_sources`: multiple source links per scenario, including shared collection URL where no standalone URL exists.
- `scenario_session_modes`: store separate supported modes, e.g. SOLO and ONE_ON_ONE; never infer SOLO from `1PL` alone. GMless needs explicit evidence.
- `scenario_durations`: multiple durations by medium/scope; no conflating main session and prologue/episode durations.
- `scenario_conditions`: HO, skill, new/continuing PCs, risk and other constraints stored with text and optional normalized data.
- `scenario_assets`: typed assets with scope and relationship (included, separate, absent, unknown).
- `sample_offers`: link a free preview, overview, partial text or separately playable free edition to a **scenario or collection**, not indiscriminately to all members.
- `acquisition_records` and `ownership_overrides`: user-specific data never populated by public scraping.
- `extraction_evidence`: original text excerpt, field path, parser version and extraction method.
- `search_queries`, `crawl_pages`, `search_hits`, `crawl_queue`: crawl provenance, deduplication and resumability.

## Collection distribution models

Derived views, not exclusive schema constraints:

1. `COLLECTION_ONLY`: collection product; no individually sold scenario confirmed.
2. `SEPARATE_PRODUCTS`: bundle and individual scenarios have distinct product URLs.
3. `SAME_PAGE_VARIANTS`: one product URL has bundle and individual variants.
4. Mixed combinations are permitted. **Absence of discovered individual offers does not prove exclusivity.** Classify as `COLLECTION_ONLY` only with sufficient evidence, otherwise `UNDETERMINED`.

## Availability vs ownership

Public catalog projections:

- `is_scenario_free`: true only when a complete, **currently obtainable**, zero-price variant covering the scenario exists. False only if evidence supports no free full version; otherwise unknown.
- `has_free_sample`: true if an accessible zero-price sample offer is linked to the scenario (or a collection-level sample when queried at collection scope). Unknown if incompletely crawled.
- `free_playable_edition_available`: an independent, playable free edition, distinct from a preview.
- For a multi-scenario collection sample, retain `collection_id` as the scope until component-level coverage is verified.

Private acquisition projections:

- `purchase_status`: derived from user acquisitions (`PURCHASED`, `FREE_ACQUIRED`, `NOT_PURCHASED`, `UNKNOWN`); distinguish no record from explicit not-purchased. In a multi-variant scenario, preferably display a list of acquired offers rather than one lossy status.
- `ownership_status`: `OWNED` if an explicit owned override or a full verified acquired variant supports it; `NOT_OWNED` only upon explicit user declaration; otherwise `UNKNOWN`. A `SAMPLE` or `ASSET_ONLY` acquisition cannot imply complete scenario ownership. If an override contradicts verified acquisitions, flag for review rather than silently discard either fact.

## Three-valued extraction

Missing != false; missing != zero. Retain null for unknown price/likes/availability/metadata. Negative evidence ("NPC立ち絵なし") is stored as `EXPLICITLY_ABSENT`, not merely absent from an asset list.

## Source-priority and evidence

1. Native product/variant data extracted from public page markup.
2. Explicit labeled statements within the item's description.
3. Strong contextual rules with retained evidence.
4. Optional LLM extraction for difficult free text, always marked as such.
5. Manual review for ambiguities.

Never parse recommended/related-product cards as the main product. Never merge canonical Scenario IDs solely on title match. Preserve original Japanese and other languages; do not mistake related conversions or source systems for direct support.

## Known limitations requiring Phase 0 probe

- Stable DOM selectors for listing cards, product descriptions and variant blocks **not yet verified**.
- Like count source and visibility **not yet verified**; store `NULL` and source `UNAVAILABLE` when unavailable, not 0.
- Category-specific page counts and card counts must be read from HTML, not assumed from the unfiltered 479-page example.
- BOOTH's category display counts are approximate snapshots, not an exhaustive or unique scenario census.
- Variant IDs and publish/update timestamps may not always be exposed.
- The 27 sample URLs discussed are **test targets**; no machine-readable ground-truth fixture has yet been created for all 27.
- Scope excludes downloading scenario files, authentication-only content, circumventing access controls and replicating copyrighted scenario text in public UI.

## Phase 0 acceptance tests

- Single scenario with paid full PDF + free preview: sample=true, full free=false, sample acquired does not imply owned.
- Full free scenario with paid assets: full free=true and no automatic private ownership.
- Bundle-only anthology: each work gets a Scenario ID and collection membership; shared BOOTH URL is valid.
- Bundle and standalone products: one Scenario ID, multiple source records.
- Same-page bundle and single variants: correct `variant_scenarios` coverage.
- Bundle sample with unclear coverage: keep sample collection-scoped.
- 1PL without KPC/DPC evidence: ONE_PLAYER_UNSPECIFIED, not SOLO.
- Explicit SOLO, ONE_ON_ONE, GMLESS_SOLO and multiple supported configurations.
- No mention of BGM: unknown, explicit "not included": absent.
- Related products never leak into the parsed product title, price, content or variants.

## Implementation notes

`schema.sql` is a validated SQLite 3.37+ schema containing the normalized tables. Some JSON-typed auxiliary columns are stored as `TEXT` for early SQLite portability and should be parsed/validated in application code. The sample JSON is a **synthetic fixture**, not scraped data. Consider adding history/snapshot tables, migrations, publisher-contributor associations and normalized episodes after the initial probe.
