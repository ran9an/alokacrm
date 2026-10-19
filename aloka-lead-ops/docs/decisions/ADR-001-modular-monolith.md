# ADR-001: Modular monolith

**Status:** Accepted

## Decision

Use one TypeScript repository with a Next.js web application, Fastify API, worker, shared contracts and PostgreSQL. Keep n8n and OpenWA as external adapters.

## Why

The initial team and VPS target do not justify distributed services. A modular monolith keeps transactions, authorization and deployment understandable while preserving integration boundaries.

## Consequences

Modules share a release cadence and database. Scale API and worker processes independently only when measured load requires it.
