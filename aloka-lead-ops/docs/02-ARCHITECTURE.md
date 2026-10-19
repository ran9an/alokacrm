# Architecture

## Scope

Aloka CRM is a private operational workspace for lead intake, ownership, qualification, activities, follow-ups, site visits, approved WhatsApp actions and audit history. Financial workflows are outside the current build.

## Runtime

```text
Website / portals / WhatsApp
            |
            v
       existing n8n
            |
            v
 Fastify API -> PostgreSQL -> integration jobs -> Sheets/reporting
      |              |
      |              +-> messaging worker -> MessagingProvider -> OpenWA
      v
 Next.js CRM <- Supabase Auth JWT
```

- `apps/web`: Next.js 16 and React 19 user interface.
- `apps/api`: Fastify API, authorization and worker.
- `packages/contracts`: Zod request validation and shared rules.
- `packages/integrations`: reporting adapters.
- `database/migrations`: forward-only PostgreSQL schema.
- `n8n`: inactive importable workflow definitions; existing n8n remains external.

## Trust boundaries

The browser authenticates with Supabase and sends its JWT to the API. The API resolves the role from `staff`; user-editable JWT metadata is never authoritative. PostgreSQL is the source of truth. Google Sheets is a reporting projection. OpenWA is isolated behind `MessagingProvider`.

## Consistency model

Lead intake, assignment, event creation and queued work use database transactions. Source event IDs and operation keys provide idempotency. Audit events are append-only through a database trigger. Provider timeouts become uncertain delivery; the application does not blindly retry.

## Known boundaries

- User provisioning is administrative; there is no public signup.
- Document metadata exists, but signed object-storage upload is not implemented.
- Offset pagination is adequate for the current scale; keyset pagination is planned.
- Inventory, quotation, booking, payment and registration workflows are not implemented.
