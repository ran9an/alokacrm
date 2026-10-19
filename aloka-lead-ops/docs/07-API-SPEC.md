# API specification

Local base URL: `http://localhost:4000`. JSON limit: 64 KB. Default rate limit: 120 requests per minute per process/IP.

## Authentication

- `POST /v1/auth/login` accepts an individual staff email and password and returns a 12-hour opaque session token.
- Staff routes: `Authorization: Bearer <session token>`.
- `POST /v1/auth/logout` revokes the current session; `GET /v1/me` returns the active staff profile.
- Passwords use salted scrypt hashes. Only SHA-256 session-token hashes are stored.
- Supabase JWT verification remains available as an optional migration-compatible path when issuer and JWKS settings are configured.
- Service routes: dedicated bearer secret named in `.env.example`.
- Errors use `{ "error": "safe message", "requestId": "..." }`; validation errors also include `issues`.

## Staff routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/leads?limit=50&offset=0` | Authorized lead page |
| POST | `/v1/leads` | Authenticated manual lead intake with deduplication and assignment |
| GET | `/v1/leads/:id` | Lead, events, follow-ups, activities, visits, document metadata and messages |
| PATCH | `/v1/leads/:id` | Stage, opt-out, assignment, qualification and lost reason |
| GET | `/v1/staff` | Manager/admin staff list |
| POST | `/v1/staff` | Admin-only individual staff account creation |
| GET | `/v1/admin/summary` | Admin/manager operational counts |
| POST | `/v1/leads/:id/followups` | Schedule idempotent follow-up |
| POST | `/v1/leads/:id/activities` | Record call, note or task |
| POST | `/v1/leads/:id/site-visits` | Schedule visit |
| PATCH | `/v1/site-visits/:id` | Complete, cancel or reschedule visit |
| POST | `/v1/leads/:id/quick-send` | Send approved WhatsApp action |

Quick-send actions: `share_brochure`, `confirm_site_visit`, `share_location`, `request_callback`.

## Service routes

| Method | Path | Secret | Purpose |
|---|---|---|---|
| POST | `/v1/intake` | `INTAKE_TOKEN` | Canonical idempotent intake |
| POST | `/v1/webhooks/openwa` | `OPENWA_WEBHOOK_TOKEN` | Normalized incoming reply |
| POST | `/v1/automation/followups` | `AUTOMATION_TOKEN` | Trusted campaign scheduling |
| GET | `/v1/automation/export` | `AUTOMATION_TOKEN` | Backend reporting export |
| GET | `/health` | None | Database health probe |

## Status semantics

`400` validation, `401` authentication, `403` role restriction, `404` missing or inaccessible resource, `409` domain conflict/suppression, `429` rate limit, `502` uncertain provider result, `503` disabled integration, `500` opaque server failure.

Request schemas are canonical in `packages/contracts/src/index.ts`. Clients must not parse human-readable error text as stable enums.
