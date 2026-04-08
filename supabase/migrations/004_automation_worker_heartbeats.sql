CREATE TABLE IF NOT EXISTS automation_worker_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id TEXT NOT NULL,
  metadata JSONB,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_worker_heartbeats_worker_id_idx
  ON automation_worker_heartbeats(worker_id);

CREATE INDEX IF NOT EXISTS automation_worker_heartbeats_last_seen_at_idx
  ON automation_worker_heartbeats(last_seen_at);
