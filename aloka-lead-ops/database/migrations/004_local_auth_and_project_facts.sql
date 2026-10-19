ALTER TABLE staff
  ADD COLUMN email text UNIQUE CHECK(email = lower(email)),
  ADD COLUMN password_hash text,
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE sessions(
  token_hash text PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES staff ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_staff_active ON sessions(staff_id,expires_at) WHERE revoked_at IS NULL;

UPDATE projects
SET location = 'Arasanahalli, STRR-Whitefield Exit, Devanagonthi, East Bengaluru'
WHERE id = 'aloka-green-county';

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
