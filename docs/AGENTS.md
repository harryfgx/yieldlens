# AGENTS.md — Operational Notes for YieldLens

## Registry Override

Global npm registry is Amazon CodeArtifact. The `.npmrc` at repo root overrides with `registry=https://registry.npmjs.org/`. Do not remove this file.

## Git Identity Override

Global git config uses `harryfg@amazon.com`. This repo uses repo-scoped config:
- `git config user.email 'harryfgoatcher@gmail.com'`
- `git config user.name 'Harry Goatcher'`

## Supabase Project

- **Project ref:** `scuggrmjkrrvciblekjj`
- **Org:** `axvcxtqefcjvbiycylwn`
- **Region:** West Europe (London)

## Connection Strings

Source: `~/personal/yieldlens/.secrets/db.env` (never commit).

- **DATABASE_URL** — pooler, transaction mode, port 6543. Use for: serverless (Vercel), tRPC, app queries.
- **DIRECT_URL** — direct connection, port 5432. Use for: migrations (`drizzle-kit`), long-running scripts, bulk ingestion.
- **SESSION_POOLER_URL** — session mode, port 5432. Use for: long transactions, psql, data ingestion.

## Test DB Strategy

Reuse dev Supabase for now. Tests that need DB connect via `DIRECT_URL`.

## Ingestion Procedure

1. `pnpm ingest:all` — runs all 7 scripts in dependency order
2. Postcode directory runs first (serial), then land-registry + mortgages (parallel), then remaining sources (parallel)
3. Final step: `SELECT refresh_postcode_metrics()` to refresh the materialised view

## Materialised View Refresh

The `mv_postcode_investment_metrics` view must be refreshed after any data ingestion:
```sql
SELECT refresh_postcode_metrics();
```
If the view fails on empty tables, defer refresh until after ingestion completes.
