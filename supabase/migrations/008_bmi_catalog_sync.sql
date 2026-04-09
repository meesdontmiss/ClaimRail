ALTER TYPE automation_job_type ADD VALUE IF NOT EXISTS 'bmi_catalog_sync';

ALTER TABLE automation_jobs
  ALTER COLUMN recording_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS bmi_catalog_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_work_key TEXT NOT NULL,
  bmi_work_id TEXT,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  iswc TEXT,
  writer_summary TEXT,
  source TEXT NOT NULL DEFAULT 'online_services_catalog',
  status TEXT,
  raw_payload JSONB,
  first_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bmi_catalog_works_user_external_work_key_idx
  ON bmi_catalog_works(user_id, external_work_key);

CREATE INDEX IF NOT EXISTS bmi_catalog_works_user_title_idx
  ON bmi_catalog_works(user_id, normalized_title);

CREATE INDEX IF NOT EXISTS bmi_catalog_works_user_work_id_idx
  ON bmi_catalog_works(user_id, bmi_work_id);

CREATE TABLE IF NOT EXISTS bmi_catalog_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  composition_work_id UUID REFERENCES composition_works(id) ON DELETE CASCADE,
  bmi_catalog_work_id UUID REFERENCES bmi_catalog_works(id) ON DELETE CASCADE NOT NULL,
  match_strategy TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  notes TEXT,
  verified BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bmi_catalog_matches_recording_work_idx
  ON bmi_catalog_matches(recording_id, bmi_catalog_work_id);

CREATE INDEX IF NOT EXISTS bmi_catalog_matches_user_recording_idx
  ON bmi_catalog_matches(user_id, recording_id);

CREATE INDEX IF NOT EXISTS bmi_catalog_matches_user_work_idx
  ON bmi_catalog_matches(user_id, bmi_catalog_work_id);

ALTER TABLE bmi_catalog_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_catalog_matches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bmi_catalog_works'
      AND policyname = 'Users can view their synced BMI catalog works'
  ) THEN
    CREATE POLICY "Users can view their synced BMI catalog works"
      ON bmi_catalog_works FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bmi_catalog_matches'
      AND policyname = 'Users can view their synced BMI matches'
  ) THEN
    CREATE POLICY "Users can view their synced BMI matches"
      ON bmi_catalog_matches FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;
