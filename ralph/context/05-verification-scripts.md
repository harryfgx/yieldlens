# Verification Scripts — Ralph's Test Harness

Every acceptance criterion in `prd.json` that can be automated is verified via one of these commands. Ralph MUST add the corresponding pnpm script in `package.json` and run it as the verification step. No manual/browser verification is permitted.

## One-command verifiers (pnpm scripts to add)

Add these to `package.json` scripts section during US-001:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "ingest:all": "tsx scripts/ingest/run-all.ts",
    "ingest:postcodes": "tsx scripts/ingest/postcode-directory.ts",
    "ingest:land-registry": "tsx scripts/ingest/land-registry.ts",
    "ingest:ons-hpi": "tsx scripts/ingest/ons-hpi.ts",
    "ingest:ons-rental": "tsx scripts/ingest/ons-rental.ts",
    "ingest:police": "tsx scripts/ingest/police-crime.ts",
    "ingest:epc": "tsx scripts/ingest/epc.ts",
    "ingest:mortgages": "tsx scripts/ingest/mortgage-products.ts",
    "benchmark": "tsx scripts/benchmark.ts",
    "screenshots": "tsx scripts/screenshots.ts",
    "audit:a11y": "tsx scripts/audit-a11y.ts",
    "audit:lighthouse": "tsx scripts/audit-lighthouse.ts",
    "audit:all": "pnpm audit:a11y && pnpm audit:lighthouse",
    "verify:data-quality": "tsx scripts/verify-data-quality.ts",
    "verify:evidence": "tsx scripts/verify-evidence.ts",
    "verify:all": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

## Pass/fail criteria for each verifier

Every verifier must exit with code 0 on pass, non-zero on fail. Ralph uses exit code as the truth signal.

### `pnpm lint`
Pass: exits 0. Fail: any error or warning (because `--max-warnings=0`).

### `pnpm typecheck`
Pass: exits 0 with no type errors.

### `pnpm test`
Pass: exits 0, all tests run, zero failed, zero skipped unless `describe.skip` is intentional and documented.

### `pnpm build`
Pass: Next.js production build completes, `.next/` directory produced, no errors.

### `pnpm db:push`
Pass: migrations apply against Supabase, exits 0.

### `pnpm ingest:all`
Pass: all 7 ingestion scripts complete, exits 0. Row counts logged.

### `pnpm verify:data-quality` (Ralph writes this script)
Script `scripts/verify-data-quality.ts` must:
1. Connect to the DB via `DIRECT_URL`.
2. Run these queries and assert thresholds:
   - `SELECT COUNT(*) FROM location` ≥ 100000
   - `SELECT COUNT(*) FROM property` ≥ 100000
   - `SELECT COUNT(*) FROM transaction` ≥ 500000
   - `SELECT COUNT(*) FROM rental_index` ≥ 500
   - `SELECT COUNT(*) FROM hpi_index` ≥ 500
   - `SELECT COUNT(*) FROM crime_stat` ≥ 10000
   - `SELECT COUNT(*) FROM mortgage_product` = 15
   - `SELECT COUNT(*) FROM transaction WHERE sale_price <= 0 OR sale_price >= 100000000` = 0
   - `SELECT COUNT(*) FROM transaction WHERE sale_date > CURRENT_DATE` = 0
   - `SELECT COUNT(*) FROM property WHERE bedrooms < 0 OR bedrooms > 20` = 0
   - `SELECT COUNT(*) FROM crime_stat WHERE count < 0` = 0
3. Write machine-readable results to `evidence/04-data-quality/quality-check-results.json` with `{dimension, metric, value, threshold, pass}` per check.
4. Exit 0 if every check passes, 1 otherwise. Print a summary table.

### `pnpm benchmark` (Ralph writes `scripts/benchmark.ts`)
Must:
1. Warm up connection with 1 throwaway query per procedure.
2. Run each of the 4 analytical queries 100 times with representative inputs.
3. Compute p50, p95, p99 latency for each.
4. Write results to `evidence/06-dashboard/performance-benchmarks.md` as a Markdown table.
5. Exit 0 if p50 < 200ms for every query; exit 1 if any fails.

### `pnpm screenshots` (Ralph writes `scripts/screenshots.ts`)
Must use Playwright in headless Chromium mode:
1. `pnpm exec playwright install chromium` must be in Ralph's setup flow.
2. Launch Playwright, set viewport to 1920x1080, deviceScaleFactor: 2 (Retina).
3. Navigate to the Vercel production URL (from env `PRODUCTION_URL` or fallback to `localhost:3000` started via `pnpm start`).
4. For each page (`/`, `/analyse`, `/compare`, `/history/SE16`, `/about`), wait for network idle, take full-page PNG to `evidence/06-dashboard/0N-<page>.png`.
5. For `/analyse`, additionally fill and submit the form with sample data (SE16, 2 bed, Flat, £400k, £1800/m, 25% deposit, first mortgage product) and capture the results screenshot as `evidence/06-dashboard/03-property-analyser-results.png`.
6. Exit 0 if all screenshots captured, 1 otherwise.

### `pnpm audit:a11y` (Ralph writes `scripts/audit-a11y.ts`)
Must use `@axe-core/playwright`:
1. Launch headless Chromium.
2. For each of the 5 pages, run `injectAxe` and `checkA11y` with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` tags.
3. Aggregate violations into one JSON report at `evidence/06-dashboard/axe-audit.json`.
4. Exit 0 if zero violations across all pages; exit 1 if any violation.

### `pnpm audit:lighthouse` (Ralph writes `scripts/audit-lighthouse.ts`)
Must use `lighthouse` npm package programmatically (not CLI — for reliability):
1. Install Chromium via `chrome-launcher` (auto-installed by lighthouse package).
2. Run Lighthouse against `env.PRODUCTION_URL` with desktop preset.
3. Run twice (warm-up + scored run), keep the scored run.
4. Save full JSON report to `evidence/06-dashboard/lighthouse-desktop.json`.
5. Extract scores. Exit 0 if Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90. Exit 1 if any below threshold. Print a summary.

### `pnpm verify:evidence` (Ralph writes `scripts/verify-evidence.ts`)
Must check every file listed in `ralph/context/04-evidence-requirements.md` exists and is non-empty:
1. Loop through expected evidence files.
2. For each: assert file exists, file size > 100 bytes (rules out empty placeholders).
3. For PNGs: assert width ≥ 1920 using `sharp` or image dimension check.
4. Exit 0 if all present and valid; exit 1 with list of missing/invalid.

### `pnpm verify:all`
Aggregate: lint + typecheck + test + build must all pass.

## Artefacts Ralph cannot automate (human handoff)

These go into a single file `evidence/HUMAN_TODO.md` — a checklist the user completes manually **after** Ralph finishes. None of these block Ralph's "done" status; Ralph only needs to produce the supporting artefacts.

1. **Record the 4-minute Loom walkthrough** using the script at `evidence/06-dashboard/loom-script.md`. Upload. Paste URL into `README.md` and `evidence/09-README.md`.
2. **Generate dbdiagram.io PNG**: copy DBML content from `evidence/01-erd/yieldlens-erd-uml.dbml`, paste into dbdiagram.io, export PNG, save to `evidence/01-erd/yieldlens-erd-uml.png` (Ralph pre-creates the DBML, the PNG is manual).
3. **Supabase Studio schema visualiser screenshot**: navigate to Supabase dashboard → Database → Schema Visualiser → save as `evidence/01-erd/supabase-studio-schema.png`.
4. **Vercel/Supabase/GitHub UI screenshots** for `evidence/08-deployment/`: take manually in browser.
5. **Optionally** run WAVE browser extension as secondary a11y check (axe is the primary programmatic check).

Ralph's PRD must NOT include TODO escape hatches for these — they're explicitly user-handled and captured in one place.
