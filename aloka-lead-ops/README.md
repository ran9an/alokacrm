# Aloka Developers · Lead operations

A monorepo foundation for the private Aloka sales workspace. PostgreSQL is authoritative; Next.js is the team interface; n8n orchestrates adapters and schedules. Your existing VPS OpenWA service remains external and replaceable through `MessagingProvider`. No OpenWA installation is included.

## Start locally

Requires Node 22+, npm, PostgreSQL 17 (or a Supabase database), and a Supabase Auth project configured with asymmetric signing keys.

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run db:migrate
npm run dev:api
# In another terminal, copy the NEXT_PUBLIC_* entries into apps/web/.env.local
npm run dev:web
# Optional dispatcher, messaging remains disabled until explicitly configured
npm run worker
```

Set DATABASE_URL before migration. The example DB password is only for local use. Root `.env` configures API/worker/scripts; Next.js reads `apps/web/.env.local`. Docker Compose supplies public settings as build arguments. Rebuild web when these change.

Create a user in Supabase Auth and insert its exact UUID into `staff` using the secure database console:

```sql
INSERT INTO staff(id,name,role) VALUES ('YOUR-AUTH-USER-UUID','Your name','admin');
```

Provision sales users similarly with role `sales`; set capacity and active flags. No public signup grants CRM access. Do not invent staff IDs or use a shared salesperson account.

```text
apps/web                 Next.js dashboard skeleton, sign-in, scoped register, profile
apps/api                 authenticated API, intake, assignment, outbound worker
packages/contracts       validation and domain types
packages/integrations    OpenWA-independent analytics and Sheets adapters
database/migrations      versioned, transactional PostgreSQL schema
n8n/workflows            importable, inactive orchestration blueprint
scripts                  migration runner
tests                    domain, HTTP and PostgreSQL compatibility checks
docs                     architecture, API contract, deployment and rollout plan
```

## Verification

```powershell
npm test
npm run typecheck
npm run build
```

## Documentation

Start with [`docs/README.md`](docs/README.md). It links the canonical architecture, schema, RBAC, business rules, workflows, API, WhatsApp, document-management, security, UI/UX, testing, deployment and roadmap documents. Architectural decisions are recorded under [`docs/decisions/`](docs/decisions/).

PGlite runs actual PostgreSQL schema tests without Docker; live PostgreSQL concurrency and external provider checks are separate rollout checks. See docs/implementation-plan.md for acceptance criteria and remaining product work. The dashboard intentionally contains no invented customer data. It is a skeleton, not a finished CRM.

## Important boundaries

Canonical intake and normalized OpenWA webhooks are implemented. Actual portal payload parsers require vendor samples and credentials. Message sending is disabled by default and the OpenWA response mapping must be checked against your VPS API explorer. No claimed safe sending rate exists: local throttles do not guarantee Meta/WhatsApp account eligibility or protection. Use explicit consent, opt-outs, and approved business processes.

GA4/Meta/Sheets HTTP adapters are included; analytics event subscriptions and a durable integration dispatcher are planned extensions. Do not mistake `integration_jobs` rows for successful exports. n8n can operate Sheets exports now through the authenticated export endpoint. The full feature rollout, segmentation rules, SLA alerts, and dashboard editing screens are specified in the implementation plan.
