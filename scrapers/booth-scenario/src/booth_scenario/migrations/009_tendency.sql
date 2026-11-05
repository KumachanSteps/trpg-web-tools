-- Scenario tendency: recommended stats, what the author says about altering
-- the scenario (改変), and sensitive (地雷) elements join the condition
-- categories; the product's publish date comes from the item JSON.
CREATE TABLE scenario_conditions_new (
  condition_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  category TEXT NOT NULL CHECK(category IN ('CHARACTER','HO','SKILL','STATUS','PVP','LOSS','MODIFICATION','CONTENT_WARNING','OTHER')),
  condition_text TEXT NOT NULL,
  normalized_value_json TEXT,
  evidence_id TEXT
);
INSERT INTO scenario_conditions_new SELECT * FROM scenario_conditions;
DROP TABLE scenario_conditions;
ALTER TABLE scenario_conditions_new RENAME TO scenario_conditions;

ALTER TABLE products ADD COLUMN published_at TEXT;
