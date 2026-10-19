# Testing and acceptance

Run before merging or deploying:

```powershell
npm run typecheck
npm test
npm run build
```

## Automated coverage

- Phone normalization.
- Ownership helper behavior.
- 09:00–21:00 IST send-window boundaries.
- Service-secret fail-closed behavior.
- Intake consent validation and spreadsheet formula escaping.
- Schema migration compatibility.
- Lead deduplication and controlled stage values.
- Event immutability and follow-up operation-key uniqueness.
- Activity and site-visit constraints.
- Unauthenticated HTTP trust boundaries.
- OpenWA provider response mapping and ambiguous receipt rejection.

## Required staging acceptance

- Disabled users are rejected.
- Sales Executive A cannot access Executive B’s lead.
- Manager can assign and reassign to active sales staff.
- An incoming reply pauses nurture; STOP cancels pending sends.
- Quick-send rejects missing consent and opt-out.
- OpenWA timeout creates an uncertain result and is not blindly retried.
- Site visit can be scheduled and completed with an audit trail.
- Sheets failure does not block intake.
- Database backup can be restored.

External provider availability, real PostgreSQL multi-worker concurrency and restore drills are deployment checks, not covered by local PGlite tests.
