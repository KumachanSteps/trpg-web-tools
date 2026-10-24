-- マーダーミステリー (MADAMIS) as a system code, and review labels that know
-- which batch they came from and whether they are test or training data.
-- SQLite cannot change a CHECK constraint in place, so the tables are rebuilt.
CREATE TABLE scenarios_new (
  scenario_id TEXT PRIMARY KEY,
  canonical_title TEXT NOT NULL,
  title_normalized TEXT,
  system_primary TEXT CHECK(system_primary IN ('COC6','COC7','EMOKLORE','MADAMIS','OTHER','UNKNOWN')),
  scenario_kind TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(scenario_kind IN ('SINGLE','EPISODIC','UNKNOWN')),
  tagline TEXT,
  synopsis TEXT,
  genre_json TEXT,
  setting_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO scenarios_new SELECT * FROM scenarios;
DROP TABLE scenarios;
ALTER TABLE scenarios_new RENAME TO scenarios;

CREATE TABLE scenario_systems_new (
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  system_code TEXT NOT NULL CHECK(system_code IN ('COC6','COC7','EMOKLORE','MADAMIS','OTHER')),
  support_type TEXT NOT NULL CHECK(support_type IN ('NATIVE','SUPPORTED','CONVERSION_PATCH','CONVERTIBLE')),
  evidence_id TEXT,
  PRIMARY KEY (scenario_id, system_code, support_type)
);
INSERT INTO scenario_systems_new SELECT * FROM scenario_systems;
DROP TABLE scenario_systems;
ALTER TABLE scenario_systems_new RENAME TO scenario_systems;

-- Labels imported before batches existed were used to tune the rules: TRAIN.
ALTER TABLE review_labels ADD COLUMN batch TEXT;
ALTER TABLE review_labels ADD COLUMN split TEXT NOT NULL DEFAULT 'TRAIN' CHECK(split IN ('TRAIN','TEST'));
