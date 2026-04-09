ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS ownership_status TEXT NOT NULL DEFAULT 'owned',
  ADD COLUMN IF NOT EXISTS ownership_note TEXT;
