-- KP-less play for two or more players (e.g. "2PL KPレス"). SQLite cannot
-- change a CHECK constraint in place, so the table is rebuilt.
CREATE TABLE scenario_session_modes_new (
  session_mode_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(scenario_id),
  mode TEXT NOT NULL CHECK(mode IN ('SOLO','ONE_ON_ONE','GMLESS_SOLO','GMLESS_MULTI','MULTI_PL','ONE_PLAYER_UNSPECIFIED','UNKNOWN')),
  player_min INTEGER CHECK(player_min >= 1),
  player_max INTEGER CHECK(player_max >= player_min),
  player_fixed INTEGER CHECK(player_fixed IN (0,1)),
  facilitator_role TEXT CHECK(facilitator_role IN ('KP','DL','GM','NONE','UNKNOWN')),
  companion_role TEXT CHECK(companion_role IN ('KPC','DPC','NPC','NONE','UNKNOWN')),
  evidence_id TEXT
);
INSERT INTO scenario_session_modes_new SELECT * FROM scenario_session_modes;
DROP TABLE scenario_session_modes;
ALTER TABLE scenario_session_modes_new RENAME TO scenario_session_modes;
CREATE INDEX idx_session_scenario ON scenario_session_modes(scenario_id);
