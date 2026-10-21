-- BOOTH Scenario Scraper - Phase 0 logical storage schema v1.0
-- SQLite 3.37+; timestamps stored as UTC ISO-8601 strings.
PRAGMA foreign_keys = ON;

CREATE TABLE publishers (
  publisher_id TEXT PRIMARY KEY,
  shop_name TEXT NOT NULL,
  shop_url TEXT UNIQUE,
  last_seen_at TEXT
);

CREATE TABLE products (
  booth_item_id INTEGER PRIMARY KEY,
  publisher_id TEXT REFERENCES publishers(publisher_id),
  product_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category_name TEXT,
  category_path TEXT,
  description_text TEXT,
  description_html TEXT,
  language TEXT,
  like_count INTEGER CHECK(like_count >= 0),
  like_count_source TEXT CHECK(like_count_source IN ('SEARCH_CARD','PRODUCT_PAGE','PUBLIC_STRUCTURED_DATA','UNAVAILABLE')),
  like_observed_at TEXT,
  listing_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(listing_status IN ('AVAILABLE','SOLD_OUT','UNLISTED','UNKNOWN')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  detail_fetched_at TEXT,
  content_hash TEXT
);

CREATE TABLE product_variants (
  variant_id TEXT PRIMARY KEY,
  booth_item_id INTEGER NOT NULL REFERENCES products(booth_item_id),
  external_variant_id TEXT,
  variant_label TEXT NOT NULL,
  price_jpy INTEGER CHECK(price_jpy >= 0),
  availability TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(availability IN ('AVAILABLE','SOLD_OUT','UNAVAILABLE','UNKNOWN')),
  delivery_type TEXT CHECK(delivery_type IN ('DIGITAL','PHYSICAL','MIXED','UNKNOWN')),
  edition_kind TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(edition_kind IN ('FULL','SAMPLE','ASSET_ONLY','FREE_PLAYABLE_EDITION','UNKNOWN')),
  language TEXT,
  file_names_json TEXT,
  UNIQUE(booth_item_id, external_variant_id)
);

CREATE TABLE scenarios (
  scenario_id TEXT PRIMARY KEY,
  canonical_title TEXT NOT NULL,
  title_normalized TEXT,
  system_primary TEXT CHECK(system_primary IN ('COC6','COC7','EMOKLORE','OTHER','UNKNOWN')),
  scenario_kind TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(scenario_kind IN ('SINGLE','EPISODIC','UNKNOWN')),
  tagline TEXT,
  synopsis TEXT,
  genre_json TEXT,
  setting_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE scenario_systems (
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  system_code TEXT NOT NULL CHECK(system_code IN ('COC6','COC7','EMOKLORE','OTHER')),
  support_type TEXT NOT NULL CHECK(support_type IN ('NATIVE','SUPPORTED','CONVERSION_PATCH','CONVERTIBLE')),
  evidence_id TEXT,
  PRIMARY KEY (scenario_id, system_code, support_type)
);

CREATE TABLE collections (
  collection_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  collection_type TEXT CHECK(collection_type IN ('ANTHOLOGY','ASSORTMENT','SERIES_BUNDLE','COLLECTION_BUNDLE','OTHER','UNKNOWN')),
  description TEXT
);

CREATE TABLE collection_scenarios (
  collection_id TEXT NOT NULL REFERENCES collections(collection_id),
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  display_order INTEGER,
  component_title TEXT,
  PRIMARY KEY (collection_id, scenario_id)
);

CREATE TABLE product_collections (
  booth_item_id INTEGER NOT NULL REFERENCES products(booth_item_id),
  collection_id TEXT NOT NULL REFERENCES collections(collection_id),
  relation_type TEXT NOT NULL CHECK(relation_type IN ('FULL_COLLECTION','PARTIAL_COLLECTION','RELATED')),
  PRIMARY KEY (booth_item_id, collection_id)
);

CREATE TABLE product_scenarios (
  booth_item_id INTEGER NOT NULL REFERENCES products(booth_item_id),
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  relation_type TEXT NOT NULL CHECK(relation_type IN ('STANDALONE','COLLECTION_MEMBER','BUNDLE_MEMBER','SAMPLE_FOR','RELATED')),
  PRIMARY KEY (booth_item_id, scenario_id, relation_type)
);

CREATE TABLE variant_scenarios (
  variant_id TEXT NOT NULL REFERENCES product_variants(variant_id),
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  coverage TEXT NOT NULL CHECK(coverage IN ('COMPLETE','PARTIAL','SAMPLE','ASSET_ONLY','UNKNOWN')),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK(verification_status IN ('VERIFIED','INFERRED','UNVERIFIED')),
  PRIMARY KEY (variant_id, scenario_id)
);

CREATE TABLE scenario_sources (
  source_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  source_url TEXT NOT NULL,
  booth_item_id INTEGER REFERENCES products(booth_item_id),
  source_type TEXT NOT NULL CHECK(source_type IN ('STANDALONE','COLLECTION','BUNDLE','EXTERNAL','SAMPLE')),
  is_direct_scenario_page INTEGER NOT NULL DEFAULT 0 CHECK(is_direct_scenario_page IN (0,1)),
  UNIQUE (scenario_id, source_url, source_type)
);

CREATE TABLE scenario_session_modes (
  session_mode_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  mode TEXT NOT NULL CHECK(mode IN ('SOLO','ONE_ON_ONE','GMLESS_SOLO','MULTI_PL','ONE_PLAYER_UNSPECIFIED','UNKNOWN')),
  player_min INTEGER CHECK(player_min >= 1),
  player_max INTEGER CHECK(player_max >= player_min),
  player_fixed INTEGER CHECK(player_fixed IN (0,1)),
  facilitator_role TEXT CHECK(facilitator_role IN ('KP','DL','GM','NONE','UNKNOWN')),
  companion_role TEXT CHECK(companion_role IN ('KPC','DPC','NPC','NONE','UNKNOWN')),
  evidence_id TEXT
);

CREATE TABLE scenario_durations (
  duration_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  mode TEXT NOT NULL CHECK(mode IN ('VOICE','TEXT','SEMI_TEXT','UNSPECIFIED')),
  scope TEXT NOT NULL CHECK(scope IN ('MAIN','INTRO','ALL_EPISODES','EPISODE','OTHER','UNSPECIFIED')),
  min_minutes INTEGER CHECK(min_minutes >= 0),
  max_minutes INTEGER CHECK(max_minutes >= min_minutes),
  approximate INTEGER NOT NULL DEFAULT 0 CHECK(approximate IN (0,1)),
  evidence_id TEXT
);

CREATE TABLE scenario_conditions (
  condition_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  category TEXT NOT NULL CHECK(category IN ('CHARACTER','HO','SKILL','PVP','LOSS','OTHER')),
  condition_text TEXT NOT NULL,
  normalized_value_json TEXT,
  evidence_id TEXT
);

CREATE TABLE scenario_assets (
  asset_id TEXT PRIMARY KEY,
  scenario_id TEXT REFERENCES scenarios(scenario_id),
  collection_id TEXT REFERENCES collections(collection_id),
  variant_id TEXT REFERENCES product_variants(variant_id),
  asset_type TEXT NOT NULL CHECK(asset_type IN ('SCENARIO_PDF','SCENARIO_TEXT','NPC_IMAGE','STILL_IMAGE','TRAILER_IMAGE','BACKGROUND','BGM_AUDIO','BGM_LIST','ROOM_ZIP','HANDOUT','APNG','MAP','OTHER')),
  availability_relation TEXT NOT NULL CHECK(availability_relation IN ('INCLUDED','SOLD_SEPARATELY','SEPARATE_PRODUCT','EXTERNAL_RESOURCE','EXPLICITLY_ABSENT','UNKNOWN')),
  evidence_id TEXT,
  CHECK(scenario_id IS NOT NULL OR collection_id IS NOT NULL OR variant_id IS NOT NULL)
);

CREATE TABLE sample_offers (
  sample_id TEXT PRIMARY KEY,
  booth_item_id INTEGER REFERENCES products(booth_item_id),
  variant_id TEXT REFERENCES product_variants(variant_id),
  scenario_id TEXT REFERENCES scenarios(scenario_id),
  collection_id TEXT REFERENCES collections(collection_id),
  sample_type TEXT NOT NULL CHECK(sample_type IN ('PREVIEW_PDF','OVERVIEW_PDF','SAMPLE_TEXT','SAMPLE_ASSETS','FREE_PLAYABLE_EDITION','OTHER')),
  sample_url TEXT,
  price_jpy INTEGER CHECK(price_jpy >= 0),
  availability TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(availability IN ('AVAILABLE','UNAVAILABLE','UNKNOWN')),
  evidence_id TEXT,
  CHECK(scenario_id IS NOT NULL OR collection_id IS NOT NULL)
);

CREATE TABLE acquisition_records (
  acquisition_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  variant_id TEXT REFERENCES product_variants(variant_id),
  scenario_id TEXT REFERENCES scenarios(scenario_id),
  acquisition_type TEXT NOT NULL CHECK(acquisition_type IN ('PURCHASED','FREE_ACQUIRED','GIFT','EXTERNAL','MANUAL')),
  scope TEXT NOT NULL CHECK(scope IN ('FULL','SAMPLE','ASSET_ONLY','UNKNOWN')),
  acquired_at TEXT,
  notes TEXT,
  CHECK(variant_id IS NOT NULL OR scenario_id IS NOT NULL)
);

CREATE TABLE ownership_overrides (
  user_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  ownership_status TEXT NOT NULL CHECK(ownership_status IN ('OWNED','NOT_OWNED','UNKNOWN')),
  reason TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, scenario_id)
);

CREATE TABLE extraction_evidence (
  evidence_id TEXT PRIMARY KEY,
  booth_item_id INTEGER NOT NULL REFERENCES products(booth_item_id),
  scenario_id TEXT REFERENCES scenarios(scenario_id),
  field_path TEXT NOT NULL,
  raw_excerpt TEXT NOT NULL,
  source_section TEXT,
  extraction_method TEXT NOT NULL CHECK(extraction_method IN ('DOM','REGEX','RULE','LLM','MANUAL')),
  confidence REAL CHECK(confidence BETWEEN 0 AND 1),
  parser_version TEXT NOT NULL,
  observed_at TEXT NOT NULL
);

CREATE TABLE search_queries (
  search_query_id TEXT PRIMARY KEY,
  category_path TEXT NOT NULL,
  tag TEXT,
  keyword TEXT,
  sort_mode TEXT,
  in_stock INTEGER CHECK(in_stock IN (0,1))
);

CREATE TABLE crawl_pages (
  crawl_page_id TEXT PRIMARY KEY,
  search_query_id TEXT NOT NULL REFERENCES search_queries(search_query_id),
  page_number INTEGER NOT NULL CHECK(page_number >= 1),
  url TEXT NOT NULL,
  fetched_at TEXT,
  http_status INTEGER,
  card_count INTEGER,
  next_page_url TEXT
);

CREATE TABLE search_hits (
  crawl_page_id TEXT NOT NULL REFERENCES crawl_pages(crawl_page_id),
  booth_item_id INTEGER NOT NULL REFERENCES products(booth_item_id),
  position_in_page INTEGER NOT NULL,
  PRIMARY KEY (crawl_page_id, booth_item_id)
);

CREATE TABLE crawl_queue (
  booth_item_id INTEGER PRIMARY KEY REFERENCES products(booth_item_id),
  state TEXT NOT NULL CHECK(state IN ('DISCOVERED','QUEUED','FETCHING','PARSED','RETRY','REVIEW','SKIPPED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_variants_product ON product_variants(booth_item_id);
CREATE INDEX idx_collection_scenarios_scenario ON collection_scenarios(scenario_id);
CREATE INDEX idx_variant_scenarios_scenario ON variant_scenarios(scenario_id);
CREATE INDEX idx_sources_scenario ON scenario_sources(scenario_id);
CREATE INDEX idx_acquisition_user ON acquisition_records(user_id);
CREATE INDEX idx_session_scenario ON scenario_session_modes(scenario_id);
