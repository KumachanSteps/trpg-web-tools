-- CoC supplements a scenario uses (support type SUPPLEMENT). Any supplement
-- code is allowed there, so a new supplement needs no migration.
CREATE TABLE scenario_systems_new (
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  system_code TEXT NOT NULL,
  support_type TEXT NOT NULL CHECK(support_type IN ('NATIVE','SUPPORTED','CONVERSION_PATCH','CONVERTIBLE','SUPPLEMENT')),
  evidence_id TEXT,
  PRIMARY KEY (scenario_id, system_code, support_type),
  CHECK(system_code IN ('COC6','COC7','EMOKLORE','MADAMIS','STORYPLAYING','OTHER') OR support_type = 'SUPPLEMENT')
);
INSERT INTO scenario_systems_new SELECT * FROM scenario_systems;
DROP TABLE scenario_systems;
ALTER TABLE scenario_systems_new RENAME TO scenario_systems;
