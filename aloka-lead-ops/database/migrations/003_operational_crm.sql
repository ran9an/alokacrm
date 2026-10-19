ALTER TABLE leads
  ADD COLUMN qualification jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN lost_reason text;

ALTER TABLE site_visits
  ADD COLUMN assigned_to uuid REFERENCES staff,
  ADD COLUMN meeting_point text,
  ADD COLUMN plots_shown text[] NOT NULL DEFAULT '{}',
  ADD COLUMN feedback text,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE activities(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads,
  kind text NOT NULL CHECK(kind IN ('call','note','task')),
  body text NOT NULL,
  outcome text,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES staff,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activities_lead_created ON activities(lead_id,created_at DESC);

CREATE TABLE documents(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads,
  kind text NOT NULL,
  access_class text NOT NULL CHECK(access_class IN ('INTERNAL','SENSITIVE','HIGHLY_SENSITIVE')),
  object_key text NOT NULL,
  original_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  uploaded_by uuid NOT NULL REFERENCES staff,
  verified_by uuid REFERENCES staff,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE INDEX documents_lead_created ON documents(lead_id,created_at DESC);

CREATE TABLE outbound_messages(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads,
  action text NOT NULL,
  body text NOT NULL,
  state text NOT NULL CHECK(state IN ('sending','sent','uncertain','failed')),
  provider text,
  provider_message_id text,
  error text,
  sent_by uuid NOT NULL REFERENCES staff,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id,action,created_at)
);
CREATE INDEX outbound_messages_lead_created ON outbound_messages(lead_id,created_at DESC);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;
