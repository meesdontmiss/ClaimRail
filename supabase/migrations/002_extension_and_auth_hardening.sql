ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'missing_release_date';
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'missing_writer';
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'missing_pro_admin';
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'no_composition_work';
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'invalid_splits';
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'incomplete_registration';
ALTER TYPE issue_type ADD VALUE IF NOT EXISTS 'duplicate_work';

ALTER TYPE writer_role ADD VALUE IF NOT EXISTS 'lyricist';
ALTER TYPE writer_role ADD VALUE IF NOT EXISTS 'composer_lyricist';
ALTER TYPE writer_role ADD VALUE IF NOT EXISTS 'arranger';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bmi_credentials_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS extension_api_key TEXT,
  ADD COLUMN IF NOT EXISTS extension_api_key_created_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_stripe_customer_id_unique'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_stripe_customer_id_unique UNIQUE (stripe_customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_stripe_subscription_id_unique'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_stripe_subscription_id_unique UNIQUE (stripe_subscription_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_extension_api_key_unique'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_extension_api_key_unique UNIQUE (extension_api_key);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bmi_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_work_id UUID REFERENCES composition_works(id) ON DELETE CASCADE NOT NULL,
  confirmation_number TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  screenshot_path TEXT
);

CREATE INDEX IF NOT EXISTS bmi_registrations_composition_work_id_idx
  ON bmi_registrations(composition_work_id);

ALTER TABLE bmi_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bmi_registrations'
      AND policyname = 'Users can view BMI registrations through recordings'
  ) THEN
    CREATE POLICY "Users can view BMI registrations through recordings"
      ON bmi_registrations FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM composition_works cw
          JOIN recordings r ON r.id = cw.recording_id
          WHERE cw.id = bmi_registrations.composition_work_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bmi_registrations'
      AND policyname = 'Users can insert BMI registrations through recordings'
  ) THEN
    CREATE POLICY "Users can insert BMI registrations through recordings"
      ON bmi_registrations FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM composition_works cw
          JOIN recordings r ON r.id = cw.recording_id
          WHERE cw.id = bmi_registrations.composition_work_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

ALTER TABLE recordings DROP CONSTRAINT IF EXISTS recordings_spotify_id_unique;
DROP INDEX IF EXISTS recordings_spotify_id_idx;

CREATE UNIQUE INDEX IF NOT EXISTS recordings_user_spotify_id_idx
  ON recordings(user_id, spotify_id);
