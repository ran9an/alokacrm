# Security

## Implemented controls

- Salted scrypt password hashes, opaque random sessions, hashed token storage, expiry and revocation.
- Optional Supabase JWT signature, issuer, audience, expiry and subject validation for migration compatibility.
- Active `staff` membership and database-derived role.
- SQL ownership filters for sales users.
- Zod validation at API boundaries.
- Separate service tokens for intake, automation and callbacks.
- Constant-time comparison for service secrets of at least 32 characters.
- Authorization headers and cookies redacted from logs.
- 64 KB request limit and rate limiting.
- PostgreSQL RLS blocks browser table access.
- Append-only audit-event trigger.
- No credentials or service secrets in public Next.js variables.

## Production requirements

- TLS at the reverse proxy; API and database bound privately.
- Long random secrets stored outside Git.
- Database least privilege, encrypted backups and restore drills.
- CSP and additional secure headers at proxy/application level.
- Central rate-limit store if horizontally scaled.
- Monitoring for auth failures, unassigned leads, uncertain messages and delayed jobs.
- Retention policy for message content, attribution and personal information.

## Incident priorities

Disable messaging on suspected credential compromise, rotate the affected secret, preserve audit/log evidence, reconcile uncertain sends, notify authorized owners and document remediation.
