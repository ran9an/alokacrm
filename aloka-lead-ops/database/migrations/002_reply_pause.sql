ALTER TABLE leads ADD COLUMN nurture_paused boolean NOT NULL DEFAULT false;
ALTER TABLE followups ADD COLUMN attempted_at timestamptz;
