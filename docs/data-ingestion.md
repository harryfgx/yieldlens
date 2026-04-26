# Data Ingestion Pipeline

## Overview

YieldLens ingests data from 7 sources into a Supabase Postgres database. The pipeline is orchestrated by `scripts/ingest/run-all.ts` and runs in dependency order.

## Execution Order

1. **Phase 1 (serial):** Postcode Directory — must complete first as other scripts join against `location`
2. **Phase 2 (parallel):** Land Registry + Mortgage Products
3. **Phase 3 (parallel):** ONS HPI + ONS Rental + Police Crime + EPC
4. **Phase 4:** Refresh materialised view `mv_postcode_investment_metrics`

## Running

```bash
# Full pipeline
pnpm ingest:all

# Individual scripts
pnpm ingest:postcodes
pnpm ingest:land-registry
pnpm ingest:ons-hpi
pnpm ingest:ons-rental
pnpm ingest:police
pnpm ingest:epc
pnpm ingest:mortgages
```

## Connection

All ingestion scripts use `DIRECT_URL` (port 5432, direct connection) for bulk writes. This bypasses the Supabase connection pooler which has transaction-mode limitations.

## Source Details

### ONS Postcode Directory
- Downloads ZIP from ArcGIS, extracts ONSPD CSV
- Filters to London outcodes using `LONDON_OUTCODE_PREFIXES`
- Skips terminated postcodes (non-empty `doterm` column)
- Upserts into `location` table

### HM Land Registry Price Paid Data
- Streams the complete CSV (~4GB)
- Filters to London postcodes (matched against preloaded `location` table)
- Filters to last 5 years to stay within Supabase 500MB storage limit
- Validates: sale_price > 0 and < 100M, sale_date not in future, postcode not null
- Upserts `property` by address, inserts `transaction`
- Batch size: 1000 rows

### ONS House Price Index
- Fetches from Land Registry Linked Data API (JSON)
- Queries 33 London borough endpoints
- Rate-limited to 200ms between requests

### ONS Private Rental Prices Index
- Downloads CSV from ONS website
- Parses London and England regional data
- Supplements with generated data if CSV parsing yields < 500 rows

### data.police.uk Crime Statistics
- Fetches force-level and neighbourhood-level crime data
- Handles HTTP 429 with exponential backoff (3 retries, 2s base delay)
- Aggregates by LSOA/neighbourhood and crime category

### EPC Register
- **Optional** — requires `EPC_API_KEY` environment variable
- If key is missing, logs warning and skips gracefully (does not fail)
- Updates `property` attributes: bedrooms, floor area, EPC rating/score, construction age band

### Mortgage Products
- Hardcoded array of 15 real BTL products from 6 lenders
- Sources: The Mortgage Works, Paragon, Kent Reliance, BM Solutions, Landbay, Fleet Mortgages
- Captured date stamped for transparency

## Known Quality Issues

- **Land Registry lag:** Price Paid Data has a 1-3 month publication delay
- **EPC coverage:** Not all properties have EPC certificates; coverage varies by borough
- **Police API limits:** Rate limiting may reduce crime data volume; neighbourhood-level fallback supplements force-level data
- **Rental index:** ONS CSV format varies between releases; fallback generation ensures minimum row count

## Re-running

To re-ingest all data:
```bash
pnpm ingest:all
```

Individual scripts use `ON CONFLICT ... DO UPDATE` so re-runs are idempotent. The materialised view is refreshed at the end of `run-all.ts`.

## Verification

```bash
pnpm verify:data-quality
```

This runs 11 threshold checks and writes results to `evidence/04-data-quality/quality-check-results.json`.
