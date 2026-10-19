# Aloka lead operations development

- Read README.md and docs/architecture.md before changing domain behavior.
- The parent sources/ directory is synced, read-only reference material. Never modify it.
- PostgreSQL is the source of truth. Google Sheets is a reporting projection only.
- Keep the existing external OpenWA VPS behind MessagingProvider. Never install or redeploy OpenWA here.
- Never bypass consent, reply pauses, opt-outs, quiet hours or the central sender lock.
- Never blindly retry uncertain delivery. Provider idempotency is not assumed.
- All user read/write APIs must enforce staff membership and sales ownership in SQL. Roles come from the database.
- Keep service credentials server-only. Do not log request bodies or tokens.
- Add forward migrations rather than editing already deployed migrations.
- Run npm test, npm run typecheck and npm run build for relevant changes.
- No invented project approvals, RERA numbers, prices, inventory or investment guarantees.
