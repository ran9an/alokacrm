# ADR-003: Initial Linux VPS deployment

**Status:** Accepted

## Decision

Deploy the web, API, worker and PostgreSQL with Docker Compose on a private Linux VPS, behind a TLS reverse proxy. Continue using the existing external n8n and OpenWA installations.

## Why

This matches the expected 4 vCPU / 8 GB RAM operating envelope and avoids premature orchestration complexity.

## Consequences

Backups must leave the VPS, containers must not hold durable uploads, and horizontal scaling requires a shared rate limiter and verified worker coordination.
