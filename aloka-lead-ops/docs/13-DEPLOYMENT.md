# Deployment and recovery

## Local development

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run db:migrate
npm run dev:api
npm run dev:web
```

The safe UI preview is `http://localhost:3000/preview`. Real CRM operation needs PostgreSQL, provisioned staff accounts, and the API.

## VPS deployment

1. Back up the database, proxy configuration and existing n8n/OpenWA configuration.
2. Configure `.env`; never commit it.
3. Run the quality gates and `docker compose build`.
4. Run `docker compose up -d`; the one-shot migration service must complete successfully.
5. Reverse proxy the private web and API origins over TLS.
6. Configure `WEB_ORIGIN` and `NEXT_PUBLIC_API_URL` consistently, then provision individual staff credentials.
7. Keep PostgreSQL, API administrative paths, n8n and OpenWA private.
8. Enable messaging only after a staff-owned delivery and callback test.

## Backup

Run encrypted daily `pg_dump` backups to off-server storage with retention. Back up n8n’s encryption key and deployment configuration separately. Perform scheduled restore drills. During restore, stop the messaging worker and reconcile `sending`/`uncertain` records before restart.

## Rollback

Database changes are forward-only. Prefer a reviewed corrective migration. For catastrophic failure, restore the verified backup and matching application image, then reconcile external messages and integration jobs before enabling workers.
