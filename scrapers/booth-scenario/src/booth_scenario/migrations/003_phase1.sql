-- Phase 1: tags, scenario organization, review labels, resumable crawling.

-- Listing card facts, used to spot products whose detail page needs a refetch.
ALTER TABLE products ADD COLUMN listing_title TEXT;
ALTER TABLE products ADD COLUMN listing_price_jpy INTEGER;
ALTER TABLE products ADD COLUMN listing_price_multi INTEGER CHECK(listing_price_multi IN (0,1));

CREATE TABLE product_tags (
  booth_item_id INTEGER NOT NULL REFERENCES products(booth_item_id),
  tag TEXT NOT NULL,
  PRIMARY KEY (booth_item_id, tag)
);

-- How one BOOTH page packages scenarios. RULE rows are recomputed; MANUAL rows
-- (from the reviewed table) win and are never overwritten by rules.
CREATE TABLE product_classifications (
  booth_item_id INTEGER PRIMARY KEY REFERENCES products(booth_item_id),
  product_kind TEXT NOT NULL CHECK(product_kind IN ('SINGLE','COLLECTION','SAME_PAGE_VARIANTS','ASSET_ONLY','NOT_SCENARIO','UNDETERMINED')),
  member_count INTEGER CHECK(member_count >= 0),
  member_titles_json TEXT,
  method TEXT NOT NULL CHECK(method IN ('RULE','MANUAL')),
  reasons_json TEXT,
  classified_at TEXT NOT NULL
);

-- Maps a derivation key (e.g. "item:123:member:タイトル") to the opaque scenario ID
-- so organizing again is idempotent. The scenario ID itself never encodes it.
CREATE TABLE scenario_keys (
  derivation_key TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id)
);

CREATE TABLE collection_keys (
  derivation_key TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(collection_id)
);

-- Possible "same work" pairs across products. Never merged automatically.
CREATE TABLE scenario_link_candidates (
  candidate_id TEXT PRIMARY KEY,
  scenario_id_a TEXT NOT NULL REFERENCES scenarios(scenario_id),
  scenario_id_b TEXT NOT NULL REFERENCES scenarios(scenario_id),
  relation TEXT NOT NULL CHECK(relation IN ('SAME_WORK','RELATED')),
  score REAL CHECK(score BETWEEN 0 AND 1),
  reasons_json TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','REJECTED')),
  created_at TEXT NOT NULL,
  UNIQUE (scenario_id_a, scenario_id_b, relation)
);

-- Hand-checked answers from the review table (ground truth for evaluation).
CREATE TABLE review_labels (
  booth_item_id INTEGER PRIMARY KEY REFERENCES products(booth_item_id),
  labels_json TEXT NOT NULL,
  reviewer_notes TEXT,
  imported_at TEXT NOT NULL
);

-- Resume point of a full listing pass, per search query.
CREATE TABLE listing_progress (
  search_query_id TEXT PRIMARY KEY REFERENCES search_queries(search_query_id),
  pass_started_at TEXT NOT NULL,
  last_page INTEGER NOT NULL DEFAULT 0,
  last_page_url TEXT,
  next_page_url TEXT,
  completed_at TEXT
);

CREATE INDEX idx_queue_state ON crawl_queue(state, next_attempt_at);
CREATE INDEX idx_product_scenarios_scenario ON product_scenarios(scenario_id);
