<div align="center">
  <img src="aloka-lead-ops/apps/web/public/brand/aloka-logo.png" alt="Aloka Developers" width="220" />

  # Aloka CRM

  **A private lead operations and customer relationship platform built for Aloka Developers.**

  From first enquiry to site visit and follow-up, Aloka CRM gives the team one dependable workspace for managing plotted-development leads with clarity, accountability, and care.
</div>

---

## Built for the Aloka sales journey

Aloka CRM is designed around how our team actually works: enquiries arrive through WhatsApp and campaign channels, leads are assigned to the right salesperson, conversations are tracked, and every genuine opportunity is guided toward a site visit.

The platform brings together:

- Centralized lead intake and ownership
- Role-based access for administrators and sales staff
- WhatsApp integration through our existing OpenWA service
- Lead assignment, follow-up, and site-visit workflows
- Google Sheets, Meta, and GA4 integration adapters
- Auditable PostgreSQL records and operational reporting
- n8n workflow blueprints for orchestration and scheduled tasks

## Technology

| Layer | Technology |
| --- | --- |
| Team interface | Next.js 16 and React 19 |
| API and workers | Fastify and TypeScript |
| Database | PostgreSQL 17 |
| Authentication | Supabase Auth |
| Automation | n8n |
| Messaging | OpenWA via a replaceable provider interface |
| Testing | Node test runner and PGlite |

## Repository structure

```text
aloka-lead-ops/
├── apps/web/               Next.js CRM interface
├── apps/api/               Authenticated API and background worker
├── database/migrations/    Versioned PostgreSQL schema
├── packages/contracts/     Shared validation and domain types
├── packages/integrations/  Messaging, analytics, and Sheets adapters
├── n8n/workflows/          Importable automation blueprints
├── tests/                  Domain, HTTP, and database tests
└── docs/                   Architecture, security, API, and rollout guides

sources/                    Aloka brand and product reference material
```

## Run locally

### Prerequisites

- Node.js 22 or newer
- npm
- Docker Desktop, or access to PostgreSQL 17
- A Supabase project configured for authentication

### Setup

```powershell
Set-Location aloka-lead-ops
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run db:migrate
```

Start the API:

```powershell
npm run dev:api
```

In a second terminal, configure the `NEXT_PUBLIC_*` values in `apps/web/.env.local`, then start the interface:

```powershell
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

The optional dispatcher can be started with `npm run worker`. Outbound messaging remains disabled until it is explicitly configured.

## Verify the project

```powershell
npm test
npm run typecheck
npm run build
```

## Operating principles

- PostgreSQL is the authoritative source of CRM data.
- Genuine phone numbers are used as contact keys; temporary WhatsApp `@lid` identifiers are never treated as customer numbers.
- Customer-initiated enquiries and outbound contacts remain distinct.
- Automated outreach is consent-aware, rate-limited, and restricted to approved business hours.
- Credentials belong in local environment files or deployment secrets—never in Git.
- Production workflow changes require backup, validation, publication, and repository synchronization.

## Documentation

Start with the [Product Requirements Document](PRD.md) for the product scope, requirements, delivery phases, and acceptance criteria. The [documentation index](aloka-lead-ops/docs/README.md) links the detailed architecture, database design, permissions, workflows, API contracts, WhatsApp integration, security, testing, deployment, and implementation roadmap.

## Project status

This repository is the active foundation for Aloka Developers' internal CRM. Core intake, authentication, assignment, database migrations, messaging abstractions, tests, and the dashboard foundation are present. Vendor-specific portal parsers, production credentials, and remaining rollout items are tracked in the [implementation plan](aloka-lead-ops/docs/implementation-plan.md).

---

<div align="center">
  <strong>Aloka Developers</strong><br />
  <em>Less Promise. More Proof.</em>
</div>
