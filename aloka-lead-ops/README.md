# Aloka Developers · Lead operations

A private, working lead operations workspace for Aloka Developers. PostgreSQL is authoritative; Next.js is the team interface; Fastify handles authentication and CRM operations; n8n orchestrates adapters and schedules. The existing VPS OpenWA service remains external and replaceable through `MessagingProvider`.

## Start locally

Requires Node 22+, npm, and PostgreSQL 17.

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run db:migrate
npm run staff:provision
npm run dev:api
# In another terminal
npm run dev:web
# Optional dispatcher, messaging remains disabled until explicitly configured
npm run worker
```

Set `DATABASE_URL`, service tokens, `ADMIN_*`, and `PRIYA_*` before migration and provisioning. Root `.env` configures API, worker, and scripts; Next.js reads `apps/web/.env.local`. Actual credentials must never be committed.

`npm run staff:provision` creates or updates the initial administrator and Priya accounts using scrypt password hashes. Administrators can create additional individual accounts from **Staff & access** in the CRM. No public signup exists and shared accounts are prohibited.

```text
apps/web                 Next.js login, dashboard, lead intake, staff administration and lead operations
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

PGlite runs actual PostgreSQL schema tests without Docker; live PostgreSQL concurrency and external provider checks remain separate rollout checks. See docs/implementation-plan.md for acceptance criteria and remaining product work. The dashboard contains no invented live customer data.

## Important boundaries

Canonical intake and normalized OpenWA webhooks are implemented. Actual portal payload parsers require vendor samples and credentials. Message sending is disabled by default and the OpenWA response mapping must be checked against your VPS API explorer. No claimed safe sending rate exists: local throttles do not guarantee Meta/WhatsApp account eligibility or protection. Use explicit consent, opt-outs, and approved business processes.

GA4/Meta/Sheets HTTP adapters are included; analytics event subscriptions and a durable integration dispatcher are planned extensions. Do not mistake `integration_jobs` rows for successful exports. n8n can operate Sheets exports now through the authenticated export endpoint. The full feature rollout, segmentation rules, SLA alerts, and dashboard editing screens are specified in the implementation plan.
