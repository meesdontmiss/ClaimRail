DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_job_type') THEN
    CREATE TYPE automation_job_type AS ENUM ('bmi_registration');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_job_status') THEN
    CREATE TYPE automation_job_status AS ENUM (
      'queued',
      'claimed',
      'running',
      'completed',
      'failed',
      'needs_human',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'automation_event_level') THEN
    CREATE TYPE automation_event_level AS ENUM ('info', 'warning', 'error');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  composition_work_id UUID REFERENCES composition_works(id) ON DELETE CASCADE,
  type automation_job_type NOT NULL,
  status automation_job_status DEFAULT 'queued' NOT NULL,
  priority INTEGER DEFAULT 100 NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 3 NOT NULL,
  worker_id TEXT,
  worker_claimed_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  result JSONB,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS automation_jobs_user_id_idx
  ON automation_jobs(user_id);

CREATE INDEX IF NOT EXISTS automation_jobs_recording_id_idx
  ON automation_jobs(recording_id);

CREATE INDEX IF NOT EXISTS automation_jobs_status_priority_idx
  ON automation_jobs(status, priority, created_at);

CREATE TABLE IF NOT EXISTS automation_job_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES automation_jobs(id) ON DELETE CASCADE NOT NULL,
  level automation_event_level DEFAULT 'info' NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS automation_job_events_job_id_idx
  ON automation_job_events(job_id, created_at);

ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_job_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_jobs'
      AND policyname = 'Users can view their own automation jobs'
  ) THEN
    CREATE POLICY "Users can view their own automation jobs"
      ON automation_jobs FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'automation_job_events'
      AND policyname = 'Users can view events for their automation jobs'
  ) THEN
    CREATE POLICY "Users can view events for their automation jobs"
      ON automation_job_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM automation_jobs aj
          WHERE aj.id = automation_job_events.job_id
            AND aj.user_id = auth.uid()
        )
      );
  END IF;
END $$;
