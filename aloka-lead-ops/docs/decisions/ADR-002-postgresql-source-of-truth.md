# ADR-002: PostgreSQL is authoritative

**Status:** Accepted

## Decision

PostgreSQL stores operational CRM state. Google Sheets is a replaceable reporting projection and must not drive authorization or transactional decisions.

## Why

Ownership, idempotency, audit history and concurrent updates require database constraints and transactions that Sheets cannot provide reliably.

## Consequences

Sheet edits do not update CRM state. Reporting failures are retried independently and never roll back a successful intake.
