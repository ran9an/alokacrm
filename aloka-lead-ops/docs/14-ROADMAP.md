# Roadmap

## Delivered foundation

- Authenticated private CRM and database-derived RBAC.
- Idempotent intake and deterministic capacity assignment.
- Lead register, detail, stage updates and qualification storage.
- Activities, follow-ups and site visits.
- Consent/opt-out/reply-pause controls.
- Approved WhatsApp quick-send and provider receipts.
- Append-only audit timeline and reporting jobs.
- Docker baseline and automated quality gates.

## Next essential operational work

1. Staff administration UI with audited activation and capacity changes.
2. Manager assignment UI and role-safe dashboard counts from server aggregates.
3. Dedicated Follow-ups and Site Visits queues with cursor pagination.
4. Configurable qualification forms and lost-reason taxonomy.
5. Durable integration-job dispatcher, retry policy and observability.
6. Object-storage upload/download and KYC verification controls.
7. Real PostgreSQL concurrency and multi-worker crash tests.
8. Production backup automation and restore drill.

## Explicitly deferred

Financial modules, quotation pricing, discounts, booking commerce, payment schedules, receipts and collections remain outside the current scope. Inventory can be introduced later only with transaction-safe hold and conflict rules.
