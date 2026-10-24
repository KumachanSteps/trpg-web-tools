-- 秘匿HO: players get private handouts. Recorded with each way to play.
ALTER TABLE scenario_session_modes ADD COLUMN secret_handouts INTEGER CHECK(secret_handouts IN (0,1));
