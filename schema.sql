CREATE TABLE IF NOT EXISTS household_state (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS household_config (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
