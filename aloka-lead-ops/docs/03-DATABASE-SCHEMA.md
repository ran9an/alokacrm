# Database schema

PostgreSQL 17 is authoritative. Apply migrations in filename order with `npm run db:migrate`.

| Table | Purpose | Important constraints |
|---|---|---|
| `staff` | CRM membership, role, capacity | Active membership required; role is admin, manager, sales or viewer |
| `projects` | Project master | Seed includes `aloka-green-county` |
| `leads` | One opportunity per phone and project | Unique `(phone, project_id)`; controlled stages; consent and suppression flags |
| `intake_receipts` | Source idempotency | Primary key `(source, event_id)` |
| `events` | Audit timeline | Update and delete rejected by trigger |
| `followups` | Scheduled next actions | Unique dedupe key; explicit delivery state |
| `site_visits` | Visit scheduling and outcome | Controlled status; meeting point and feedback fields |
| `activities` | Calls, notes and tasks | Controlled activity kind and staff creator |
| `documents` | Secure-file metadata | No binary data; controlled access class and verification state |
| `outbound_messages` | Manual quick-send receipts | Explicit sending, sent, uncertain or failed state |
| `provider_receipts` | Webhook idempotency | Provider and event ID key |
| `integration_jobs` | Reporting delivery intent | Unique event and destination |

## Lead stages

`new`, `contacted`, `qualified`, `visit_scheduled`, `visited`, `negotiation`, `booked`, `registered`, `lost`.

`booked` and `registered` remain in the legacy stage enum for compatibility; financial and registration workflows are not implemented.

## Migration policy

Never edit an applied migration. Add a numbered forward migration, test it in PGlite and PostgreSQL staging, back up production, then migrate once. Migration `003_operational_crm.sql` adds the current non-financial operational records.

## Row-level security

RLS is enabled with no browser policies. Browser/PostgREST access is intentionally denied. The trusted API database role performs authorization in SQL; do not expose its credentials.
