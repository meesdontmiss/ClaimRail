-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE issue_type AS ENUM (
  'missing_isrc',
  'missing_writers',
  'missing_pro_registration',
  'missing_admin',
  'incomplete_splits',
  'metadata_mismatch',
  'duplicate_isrc',
  'other'
);
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE writer_role AS ENUM ('writer', 'composer', 'producer', 'publisher');

-- Users table (linked to NextAuth/Spotify)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Recordings (imported tracks from Spotify)
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  spotify_id TEXT UNIQUE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  isrc TEXT,
  release_date DATE,
  duration TEXT,
  claim_readiness_score INTEGER DEFAULT 0,
  imported_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Composition Works (publishing entities)
CREATE TABLE IF NOT EXISTS composition_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  pro_registered BOOLEAN DEFAULT FALSE,
  admin_registered BOOLEAN DEFAULT FALSE,
  iswc TEXT,
  pro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Writers (songwriters and publishers)
CREATE TABLE IF NOT EXISTS writers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_work_id UUID REFERENCES composition_works(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pro TEXT,
  ipi TEXT,
  role writer_role DEFAULT 'writer'
);

-- Work Splits (percentage ownership)
CREATE TABLE IF NOT EXISTS work_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  writer_id UUID REFERENCES writers(id) ON DELETE CASCADE NOT NULL,
  percentage INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Catalog Issues (problems detected in catalog)
CREATE TABLE IF NOT EXISTS catalog_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  type issue_type NOT NULL,
  severity issue_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_label TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Claim Tasks (action items for users)
CREATE TABLE IF NOT EXISTS claim_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status task_status DEFAULT 'pending' NOT NULL,
  created_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS recordings_user_id_idx ON recordings(user_id);
CREATE INDEX IF NOT EXISTS recordings_spotify_id_idx ON recordings(spotify_id);
CREATE INDEX IF NOT EXISTS composition_works_recording_id_idx ON composition_works(recording_id);
CREATE INDEX IF NOT EXISTS writers_composition_work_id_idx ON writers(composition_work_id);
CREATE INDEX IF NOT EXISTS work_splits_writer_id_idx ON work_splits(writer_id);
CREATE INDEX IF NOT EXISTS catalog_issues_recording_id_idx ON catalog_issues(recording_id);
CREATE INDEX IF NOT EXISTS catalog_issues_resolved_idx ON catalog_issues(resolved);
CREATE INDEX IF NOT EXISTS claim_tasks_recording_id_idx ON claim_tasks(recording_id);
CREATE INDEX IF NOT EXISTS claim_tasks_status_idx ON claim_tasks(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE composition_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE writers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own user record"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own user record"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for recordings
CREATE POLICY "Users can view their own recordings"
  ON recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings"
  ON recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
  ON recordings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON recordings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for composition_works
CREATE POLICY "Users can view composition works through recordings"
  ON composition_works FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = composition_works.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert composition works through recordings"
  ON composition_works FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = composition_works.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update composition works through recordings"
  ON composition_works FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = composition_works.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete composition works through recordings"
  ON composition_works FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = composition_works.recording_id
      AND r.user_id = auth.uid()
    )
  );

-- RLS Policies for writers
CREATE POLICY "Users can view writers through composition works"
  ON writers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM composition_works cw
      JOIN recordings r ON r.id = cw.recording_id
      WHERE cw.id = writers.composition_work_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert writers through composition works"
  ON writers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM composition_works cw
      JOIN recordings r ON r.id = cw.recording_id
      WHERE cw.id = writers.composition_work_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update writers through composition works"
  ON writers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM composition_works cw
      JOIN recordings r ON r.id = cw.recording_id
      WHERE cw.id = writers.composition_work_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete writers through composition works"
  ON writers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM composition_works cw
      JOIN recordings r ON r.id = cw.recording_id
      WHERE cw.id = writers.composition_work_id
      AND r.user_id = auth.uid()
    )
  );

-- RLS Policies for work_splits
CREATE POLICY "Users can view work splits through writers"
  ON work_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM writers w
      JOIN composition_works cw ON cw.id = w.composition_work_id
      JOIN recordings r ON r.id = cw.recording_id
      WHERE w.id = work_splits.writer_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work splits through writers"
  ON work_splits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM writers w
      JOIN composition_works cw ON cw.id = w.composition_work_id
      JOIN recordings r ON r.id = cw.recording_id
      WHERE w.id = work_splits.writer_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update work splits through writers"
  ON work_splits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM writers w
      JOIN composition_works cw ON cw.id = w.composition_work_id
      JOIN recordings r ON r.id = cw.recording_id
      WHERE w.id = work_splits.writer_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete work splits through writers"
  ON work_splits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM writers w
      JOIN composition_works cw ON cw.id = w.composition_work_id
      JOIN recordings r ON r.id = cw.recording_id
      WHERE w.id = work_splits.writer_id
      AND r.user_id = auth.uid()
    )
  );

-- RLS Policies for catalog_issues
CREATE POLICY "Users can view catalog issues through recordings"
  ON catalog_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = catalog_issues.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert catalog issues through recordings"
  ON catalog_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = catalog_issues.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update catalog issues through recordings"
  ON catalog_issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = catalog_issues.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete catalog issues through recordings"
  ON catalog_issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = catalog_issues.recording_id
      AND r.user_id = auth.uid()
    )
  );

-- RLS Policies for claim_tasks
CREATE POLICY "Users can view claim tasks through recordings"
  ON claim_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = claim_tasks.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert claim tasks through recordings"
  ON claim_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = claim_tasks.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update claim tasks through recordings"
  ON claim_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = claim_tasks.recording_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete claim tasks through recordings"
  ON claim_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recordings r
      WHERE r.id = claim_tasks.recording_id
      AND r.user_id = auth.uid()
    )
  );
