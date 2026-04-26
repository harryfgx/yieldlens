# PRD — YieldLens: London BTL Investment Decision-Support Web App

**Assignment:** QMUL IOT552U 002 Project Report (70% of module grade)
**Deadline:** Friday 8th May 2026, 23:59
**Student:** Harry Goatcher
**Target mark:** 95-99 / 100

---

## 1. Introduction / Overview

**YieldLens** is a publicly accessible Next.js web application that helps UK buy-to-let investors evaluate London residential property investments. It combines real HM Land Registry transactions, ONS house price and rental indices, data.police.uk crime data, and the EPC Register to produce:

- A composite investment score (0-100) combining yield, capital growth, risk, and mortgage cashflow
- Comparables analysis for any user-entered property
- Interest-only vs Repayment mortgage scenario modelling
- Multi-level historical drill-down (postcode sector → outcode → area → region)
- A yield-vs-growth quadrant classification for all London outcodes
- A London-borough crime choropleth

This PRD is executed by **Ralph** (autonomous agent loop) for all coding, infrastructure, deployment, and automated verification. **The user writes the 3000-word report and the supporting docs afterward** — Ralph does not write the assessed prose.

See `ralph/context/` for complete supporting material:
- `01-assessment-brief.md` — full QMUL mark scheme + KSBs
- `02-lecture-synthesis.md` — module citations + frameworks + phrases
- `03-technical-plan.md` — stack, 8-entity schema, queries, viz
- `04-evidence-requirements.md` — evidence folder spec
- `05-verification-scripts.md` — exact commands Ralph runs
- `06-report-artefacts.md` — structure of docs the user (not Ralph) writes

## 2. Goals

1. Deliver a production-ready, publicly accessible dashboard on Vercel, backed by Supabase Postgres (London region), loaded with ≥500K real London property transactions
2. Implement 8 data entities + 1 materialised view + 4 multi-table analytical SQL queries, each labelled with its S11 technique (Descriptive / Statistical / Diagnostic / Predictive)
3. Ship 8 "beyond taught" Postgres features: composite indexes, check constraints, audit triggers, materialised view, PL/pgSQL stored function, enums, controlled denormalisation, least-privilege role
4. Achieve WCAG 2.1 AA accessibility (zero axe violations), Lighthouse desktop ≥90 on Performance/A11y/Best Practices/SEO, p50 query latency <200ms
5. Capture all evidence artefacts (screenshots, ERD exports, EXPLAIN ANALYZE, data quality reports, migration examples) into `evidence/` with a machine-verified completeness check
6. Provide a curated Harvard-format reference list with every citation programmatically verified against Google Books / CrossRef / publisher URLs (zero hallucinations)
7. Create empty skeletons for the 9 user-written Markdown docs, with required section headings, so `pnpm verify:evidence` passes once the user fills them in

## 3. User Stories (authoritative list — detail in `prd.json`)

Each story is sized for one Ralph context window. Target 5-8 core stories + 1 reference verification story = **9 total.**

### US-001: Project Scaffold, Infrastructure, and Report Artefact Skeletons (priority 1)
**Description:** As the developer, I want a scaffolded T3 app wired to Supabase and Vercel, CI configured, and all report artefact skeletons produced, so that subsequent stories can focus on code.
**Key deliverables:**
- T3 app scaffold with Tailwind, tRPC, Drizzle, Postgres, App Router, ESLint
- `.npmrc` overriding Amazon CodeArtifact registry
- Repo-scoped git config using personal email `harryfgoatcher@gmail.com`
- Installed deps: @tremor/react, @nivo/*, lucide-react, react-hook-form, postgres, pg, vitest, playwright, lighthouse, sharp
- shadcn/ui initialised with 13 components installed
- `.env` populated from `.secrets/db.env`
- Supabase connection verified via `scripts/verify-db-connection.ts`
- Public GitHub repo `harryfgx/yieldlens` created with MIT licence
- Vercel project linked, env vars added to production + preview + dev scopes
- First production deploy returning HTTP 200
- GitHub Actions CI running lint + typecheck + test + build (green on first run)
- Repo topics set
- `evidence/` directory structure (9 subfolders) created
- `evidence/HUMAN_TODO.md` with 5 browser-only tasks for post-completion
- Empty skeleton files with required section headings for all 9 user-written docs (`docs/research-questions.md`, `docs/scenario-swot.md`, `docs/user-journey-map.md`, `docs/risk-register.md`, `docs/requirements-analysis.md`, `docs/data-model.md`, `docs/analytical-queries.md`, `docs/deployment-plan.md`, `docs/references.md`)
- `docs/AGENTS.md` with factual operational notes (registry, git identity, DB URL rules)
- `README.md` with live URL, tech stack, setup, data sources (OGL attribution), licence

**Verification commands:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` exits 0; `curl -sI $PRODUCTION_URL` returns 200; `gh run list` shows green CI; all doc skeletons present with required headings.

### US-002: Drizzle Schema with 8 Entities and Advanced Postgres Features (priority 2)
**Description:** As the developer, I want the full 8-entity schema with triggers, stored function, materialised view, and least-privilege role, so that the database satisfies 3NF/BCNF with the A+ "beyond taught" criterion.
**Key deliverables:**
- `src/server/db/schema.ts` defining 5 pgEnums + 8 tables (location, property, transaction, rental_index, hpi_index, crime_stat, mortgage_product, investor_scenario) with exact attribute + type + constraint specs from `ralph/context/03-technical-plan.md`
- Composite indexes including `(outcode, sale_date DESC)` on transaction and `(lsoa_code, reference_month)` on crime_stat
- Check constraints on prices, bedrooms, dates, percentages
- Migration `0001_triggers_and_functions.sql`: `trigger_set_timestamp()` PL/pgSQL function + triggers on each `updated_at` column
- Migration `0002_mortgage_function.sql`: `calculate_monthly_payment(principal, annual_rate_pct, term_years, mortgage_type)` with exact amortisation formula, zero-interest edge case, INTEREST_ONLY branch, principal=0 returning 0
- Migration `0003_outcode_trigger.sql`: trigger maintaining controlled-denormalised `transaction.outcode` from property → location join
- Migration `0004_materialised_view.sql`: `mv_postcode_investment_metrics` with quartiles via NTILE + CASE quadrant classification + `refresh_postcode_metrics()` refresh function
- Migration `0005_readonly_role.sql`: `app_readonly` role with SELECT + EXECUTE grants
- DBML source file at `evidence/01-erd/yieldlens-erd-uml.dbml` using UML multiplicity notation (Jonathan Jackson's preference)
- Full concatenated DDL at `evidence/02-schema-ddl/schema-full.sql`
- Advanced features extracted to `evidence/02-schema-ddl/advanced-features.sql`
- Schema JSDoc comments explaining purpose + denormalisation trade-offs
- `scripts/verify-schema.ts` asserting 8 tables + 3 functions + 1 matview + 1 role exist
- `tests/db/mortgage-function.test.ts` with 5 test cases covering REPAYMENT/INTEREST_ONLY/zero-rate/zero-principal/500k-30yr edge cases

**Verification commands:** `pnpm db:push` exits 0; `pnpm tsx scripts/verify-schema.ts` exits 0; `pnpm test --run tests/db/mortgage-function.test.ts` exits 0; `grep -c 'Table ' evidence/01-erd/yieldlens-erd-uml.dbml` equals 8.

### US-003: Data Ingestion Pipeline with DAMA Quality Assessment (priority 3)
**Description:** As the developer, I want ETL scripts that load real London data from 7 sources and produce a machine-verifiable data quality assessment, so that the dashboard has authentic data.
**Key deliverables:**
- `scripts/ingest/sources.ts` exporting typed constants for all 7 source URLs + London outcode prefix list
- `scripts/ingest/lib/db.ts` + `lib/logger.ts`
- `scripts/ingest/postcode-directory.ts` loading ≥100000 London postcodes into `location`
- `scripts/ingest/land-registry.ts` streaming Price Paid CSV, filtering London, skipping invalid rows with categorised reasons, inserting ≥500000 transactions and ≥100000 properties
- `scripts/ingest/ons-hpi.ts`, `ons-rental.ts`, `police-crime.ts`, `epc.ts`, `mortgage-products.ts` — each with thresholds
- `scripts/ingest/run-all.ts` orchestrating dependency order
- Final refresh of `mv_postcode_investment_metrics`
- `scripts/verify-data-quality.ts` asserting 11 threshold queries, writing machine-readable JSON to `evidence/04-data-quality/quality-check-results.json`, exiting 0 only if all pass
- `evidence/03-data-sources/source-catalogue.md` (Markdown table, factual — Ralph writes)
- Ingestion logs captured to `evidence/03-data-sources/ingestion-logs/`
- `tests/ingest/land-registry.test.ts` + `tests/ingest/run-all.test.ts`

**Verification commands:** `pnpm ingest:all` exits 0; `pnpm verify:data-quality` exits 0; `pnpm test` passes; CI green.

**Note:** Ralph does NOT write `evidence/04-data-quality/dama-assessment.md` narrative — it creates a skeleton with 6 section headings that the user fills in.

### US-004: Four Analytical SQL Queries via tRPC, Benchmarked (priority 4)
**Description:** As the developer, I want the 4 multi-table analytical queries exposed via tRPC with captured EXPLAIN plans and performance benchmarks, so that the dashboard has decision-supporting analytics.
**Key deliverables:**
- `src/server/db/index.ts` exporting pooled `db` client
- `src/server/api/routers/analytics.ts` with Zod-validated procedures:
  - `comparables` (Q1, Descriptive + Statistical) — 3-table join, `PERCENTILE_CONT`, 24-month window, ±20% floor area filter
  - `historicalDrilldown` (Q2, Descriptive + Predictive) — 4-table join, CTEs, `LAG()` + `AVG() OVER` window functions, YoY growth, 4 geographic levels
  - `compositeScore` (Q3, Diagnostic — HERO QUERY) — 6-table join, CTEs, NTILE(4), CASE classification, calls `calculate_monthly_payment()`, weighted scoring 35/25/20/20
  - `quadrant` (Q4, Descriptive Classification) — uses matview
  - Plus `novelInsight`, `compareSnapshot`, `historicalFindings`, `listMortgageProducts`, `crimeByBorough`
- Each query's SQL copied to `evidence/05-sql-queries/q{N}-*.sql` with leading comment block (name, S11 label, decision, tables joined, features)
- `EXPLAIN (ANALYZE, BUFFERS)` output captured for each query to `evidence/05-sql-queries/q{N}-*-explain.txt`
- `scripts/benchmark.ts` running each query 100 times, writing p50/p95/p99 to `evidence/06-dashboard/performance-benchmarks.md`, exiting 0 only if all p50 < 200ms
- `tests/api/analytics.test.ts` with 6 test cases covering validation errors, shape assertions, and quadrant enum completeness

**Verification commands:** `pnpm benchmark` exits 0; `pnpm test` passes; all 4 SQL files + explain.txt files present.

**Note:** Ralph does NOT write `docs/analytical-queries.md` literature-justified narrative — it creates a skeleton with the Loshin BI Spectrum heading + 4 query sections. User fills in the Knaflic/Wexler prose.

### US-005: Home Page, Postcode Explorer, and About-the-Data Page (priority 5)
**Description:** As a user, I want a polished landing page with novel-insight card and a transparent data-sources page, so that the tool is credible and easy to enter.
**Key deliverables:**
- `src/components/site-nav.tsx` + `site-footer.tsx` + modified `src/app/layout.tsx`
- `src/app/page.tsx` home page: hero with exact tagline "Know if a London property is a good investment before you buy", sub-hero ≥80 words, postcode search Input navigating to `/history/[outcode]`, novel-insight card (via `trpc.analytics.novelInsight`), 3 CTA tiles
- `src/app/about/page.tsx` with 7 data source entries (from `src/config/data-sources.ts`), methodology section (S11 labels, composite score weighting), known limitations, licence info
- Tailwind responsive at 375/768/1920; keyboard focus rings; heading hierarchy
- `tests/app/home.test.tsx` + `tests/app/about.test.tsx` with 5+4 test cases
- Production deploy returns 200 at `/` and `/about`; curl content assertions pass

**Verification commands:** `curl -s $PRODUCTION_URL | grep -q 'Know if a London property'` matches; `pnpm test` passes; build green.

### US-006: Property Analyser (What-If Calculator) Page (priority 6)
**Description:** As a user, I want a form to analyse a hypothetical property and see composite score, comparables, and IO-vs-Repayment mortgage scenarios, so that I can evaluate a specific investment.
**Key deliverables:**
- `src/lib/mortgage.ts` exporting `calculateMonthlyPayment()` matching PL/pgSQL function exactly
- `tests/lib/mortgage.test.ts` with 5 test cases mirroring US-002 DB tests
- `src/lib/analyse-schema.ts` Zod validation schema
- `src/app/analyse/page.tsx` with React Hook Form + zodResolver, 7 form fields (postcode, bedrooms, propertyType, askingPrice, expectedMonthlyRent, depositPct, mortgageProductId)
- Validation errors inline; submit calls `compositeScore` mutation
- Results card with composite score Badge (coloured), verdict Badge with emoji, 4 Progress bars, yield stat cards
- Mortgage scenarios section with two side-by-side cards (IO vs Repayment)
- Tremor BarChart for mortgage cashflow comparison
- Sortable comparables table (shadcn Table)
- Empty state + error state
- Mobile responsive, fully accessible
- `tests/app/analyse.test.tsx` with 6 test cases

**Verification commands:** `curl -sI $PRODUCTION_URL/analyse` returns 200; `pnpm test` passes; build green.


### US-007: Compare, Historical Drill-Down, Quadrant, and Choropleth (priority 7)
**Description:** As a user, I want to compare up to 4 postcodes side-by-side, drill down into area history with nested trend charts, and see a quadrant plot plus crime choropleth, so that I can contextualise investment opportunities visually.
**Key deliverables:**
- `src/app/compare/page.tsx` with up-to-4 postcode inputs, toast on 5th attempt, grid of cards, Tremor BarChart for yield comparison, Nivo ResponsiveScatterPlot with quadrant backgrounds
- `src/app/history/[outcode]/page.tsx` dynamic route with 4 stacked Tremor LineCharts (4 geographic levels), breadcrumb, Key Findings section
- New tRPC procedure `analytics.historicalFindings` returning 2-3 auto-generated insights
- `src/app/insights/quadrant/page.tsx` with full Nivo scatter showing ALL London outcodes, coloured by quadrant, with legend
- `scripts/fetch-geojson.ts` downloading London boroughs GeoJSON to `public/geo/london-boroughs.geojson` (≥20 features, valid JSON)
- `src/app/insights/crime-map/page.tsx` with Nivo ResponsiveChoropleth, inverted crime rate fill, alt text summarising top-5 safest/least-safe
- Site nav updated with Insights links
- `tests/app/compare.test.tsx` + `history.test.tsx` + `components/quadrant-chart.test.tsx`

**Verification commands:** `curl -sI` returns 200 for `/compare`, `/history/SE16`, `/insights/quadrant`, `/insights/crime-map`; `pnpm test` passes; build green.

### US-008: Quality Gates, Evidence Pack, and Doc Skeletons Finalised (priority 8)
**Description:** As the user writing the report, I want all automated quality gates passed and all verifiable evidence captured, so that the submission satisfies every automatable A+ criterion.
**Key deliverables:**
- `scripts/screenshots.ts` using Playwright headless Chromium at 1920x1080 Retina; captures 7 page screenshots + analyser-results screenshot
- `scripts/audit-a11y.ts` using `@axe-core/playwright`; WCAG 2.1 AA tags; iterates on violations until zero; writes `evidence/06-dashboard/axe-audit.json`
- `scripts/audit-lighthouse.ts` using lighthouse npm package with chrome-launcher; desktop preset; writes `evidence/06-dashboard/lighthouse-desktop.json`; Performance/A11y/BP/SEO all ≥90
- `pnpm benchmark` re-run against production URL
- `evidence/07-migrations-demo/expand-contract-example.md` worked example with 5-step SQL snippets (factual technical content — Ralph writes this one)
- `evidence/06-dashboard/loom-script.md` — skeleton with timestamps and prompts (user writes final script)
- `evidence/09-README.md` master index — factual table listing every evidence file with description + report section mapping
- `scripts/verify-evidence.ts` checking every expected file exists + size + PNG width ≥1920; exits 0 only if all pass
- `README.md` polished with badges, live URL, GitHub link, architecture diagram, final attributions

**Verification commands:** `pnpm audit:a11y && pnpm audit:lighthouse && pnpm benchmark && pnpm verify:evidence && pnpm verify:all` all exit 0; production URL stable; CI green.

**Note:** Ralph does NOT write `docs/deployment-plan.md` narrative. It leaves the skeleton from US-001 with required headings (ITIL, Kotter, expand-contract, safeguards, rollback). User fills in the prose.

### US-009: Harvard Reference Verification (priority 9)
**Description:** As the user writing the report, I want a programmatically-verified reference list so that there are zero hallucinated citations.
**Key deliverables:**
- `scripts/verify-references.ts` that parses `docs/references.md`, makes HTTP requests to Google Books API / CrossRef / publisher URLs, asserts title + author match, writes `evidence/10-references/verification-report.json`, exits 0 only if all verified
- `scripts/check-citations.ts` that greps `docs/*.md` for cited author names and confirms each has an entry in `docs/references.md`
- `pnpm verify:references` script added to package.json + CI workflow
- `evidence/10-references/` directory created and added to `evidence/09-README.md` index

**Verification commands:** `pnpm verify:references` exits 0 (assumes user has populated `docs/references.md` first with ≥15 entries); `pnpm test` passes; CI green.

**Note:** Ralph does NOT curate the reference list — user populates `docs/references.md`. Ralph provides the verification tooling so the user's list can be machine-checked.

## 4. Functional Requirements

1. System loads ≥500000 real London property transactions from HM Land Registry Price Paid Data covering last 10 years
2. System computes rental yield estimates by joining ONS Private Rental Prices Index to property records
3. System displays composite investment score (0-100) combining yield (35%), capital growth (25%), risk (20%), and mortgage cashflow (20%) for user-entered property
4. System returns analysis within 3 seconds of form submission
5. System displays mortgage cashflow for both interest-only and repayment scenarios using `calculate_monthly_payment` PL/pgSQL function
6. System allows comparison of up to 4 London postcodes side-by-side
7. System provides multi-level historical drill-down using SQL window functions
8. System classifies postcodes into investment quadrants using NTILE percentile bucketing
9. System displays choropleth map of London crime rates by borough
10. System lists all data sources with OGL v3.0 attribution on About-the-Data page
11. System is publicly accessible without login
12. System exposes analytical queries through tRPC routers

## 5. Non-Goals (Out of Scope)

- **NG-1** Live listings integration (no free compliant UK API exists; app works on historical + user-input)
- **NG-2** Scotland/Wales/NI coverage (Land Registry PPD is England & Wales only; scope London for depth)
- **NG-3** User authentication / accounts
- **NG-4** Machine learning / predictive models (classical SQL analytics only)
- **NG-5** Real-time price updates
- **NG-6** Mobile native app
- **NG-7** Payment processing / listings marketplace
- **NG-8** **The 3000-word report itself** (user writes manually)
- **NG-9** **Scenario Analysis docs with assessed prose** (user writes; Ralph creates skeletons only): `docs/research-questions.md`, `docs/scenario-swot.md`, `docs/user-journey-map.md`, `docs/risk-register.md`, `docs/requirements-analysis.md`, `docs/data-model.md` (narrative parts), `docs/analytical-queries.md` (literature parts), `docs/deployment-plan.md`, `docs/references.md`
- **NG-10** The 4-minute Loom video recording (user records using Ralph-prepared script skeleton)
- **NG-11** The 5 browser-only evidence artefacts (dbdiagram.io PNG, Supabase Studio screenshot, Vercel/Supabase/GitHub UI screenshots) — user captures manually

## 6. Technical Considerations

### Existing patterns
- **T3 stack conventions:** tRPC routers in `src/server/api/routers/`, DB schema in `src/server/db/schema.ts`, env vars via `@t3-oss/env-nextjs`
- **Drizzle raw SQL for analytical queries:** use `sql` template tag (not query builder) so SQL is legible for the report

### Single source of truth
- `env.DATABASE_URL` — pooler (port 6543) for serverless/app queries
- `env.DIRECT_URL` — direct (port 5432) for migrations and bulk ingestion
- Mortgage calculation: PL/pgSQL function is authoritative; TS utility is tested for parity
- Data source URLs: `scripts/ingest/sources.ts`

### Prerequisites (already set up)
- Node v22.14.0, pnpm 10.33.2, vercel 52.0.0, gh 2.91.0, supabase 2.90.0
- gh authed as `harryfgx`; vercel authed as `harryfg`; supabase yieldlens project provisioned
- Supabase project ref: `scuggrmjkrrvciblekjj`, West EU London
- Connection strings pre-verified and saved at `~/personal/yieldlens/.secrets/db.env`

### Critical overrides
- **Registry:** global npm registry is Amazon CodeArtifact; `.npmrc` at repo root must override with `registry=https://registry.npmjs.org/`
- **Git identity:** global is `harryfg@amazon.com`; repo-scoped must be `harryfgoatcher@gmail.com` (set via `git config user.email` — NOT `--global`)

### Dev workflow
- `pnpm dev` / `db:generate` / `db:migrate` / `db:push` / `ingest:all` / `benchmark` / `screenshots` / `audit:a11y` / `audit:lighthouse` / `verify:data-quality` / `verify:evidence` / `verify:references` / `verify:all`
- All scripts defined in `ralph/context/05-verification-scripts.md`

### What Ralph should NOT do
- Do not write assessed prose in `docs/*.md` (NG-9 list) — create skeletons only
- Do not write `evidence/04-data-quality/dama-assessment.md` narrative — create skeleton
- Do not record the Loom video
- Do not commit secrets
- Do not use `git push --force` or destructive operations
- Do not modify anything outside `~/personal/yieldlens/` + GitHub/Vercel/Supabase projects

## 7. Success Metrics

- **Functional:** all 7 routes (`/`, `/analyse`, `/compare`, `/history/[outcode]`, `/about`, `/insights/quadrant`, `/insights/crime-map`) return HTTP 200 from production URL
- **Data:** `pnpm verify:data-quality` exits 0 (≥500K transactions, ≥100K properties, all quality thresholds passed)
- **Quality:** `pnpm audit:a11y` exits 0 (zero WCAG 2.1 AA violations); `pnpm audit:lighthouse` exits 0 (all 4 categories ≥90); `pnpm benchmark` exits 0 (p50 <200ms on all 4 queries)
- **Coverage:** `pnpm verify:evidence` exits 0 (every expected artefact exists + valid)
- **References (after user populates):** `pnpm verify:references` exits 0 (every citation verified against Google Books / CrossRef / publisher URL)
- **CI:** GitHub Actions green on `main` after every commit
- **Reproducibility:** anyone cloning the repo can follow README to stand up locally (given their own Supabase project)
- **Mark scheme alignment:** every automatable A+ criterion (see `ralph/context/01-assessment-brief.md`) has a direct evidence artefact or code feature backing it

## 8. Open Questions (resolved with defaults)

- **OQ-1** School density indicator — **Default:** out of scope for v1; stub on home page if data readily available, otherwise omit
- **OQ-2** Choropleth granularity — **Default:** borough (33 polygons) for performance; justify in `docs/deployment-plan.md`
- **OQ-3** Supabase free tier 500MB limit — **Default:** if exceeded, reduce Land Registry window from 10 years to 5 years (still meeting ≥500K threshold); document in `docs/AGENTS.md`
- **OQ-4** CI cost on large migration tests — **Default:** run migration forward-backward only on PRs to main, not every push

---

## 9. Handoff After Ralph Completion

After Ralph finishes all 9 stories, the user completes the assignment via these ~10-11 hours of work:

1. **5 browser artefacts (~30 min)** — see `evidence/HUMAN_TODO.md`
2. **8 Markdown docs (~4-5 hours)** — fill in skeletons:
   - `docs/research-questions.md` (20 min)
   - `docs/scenario-swot.md` (40 min)
   - `docs/user-journey-map.md` (40 min — Canada Water narrative)
   - `docs/risk-register.md` (20 min)
   - `docs/requirements-analysis.md` (60 min)
   - `docs/data-model.md` (60 min — refine Ralph's factual draft)
   - `docs/analytical-queries.md` (45 min — add literature layer)
   - `docs/deployment-plan.md` (45 min)
   - `docs/references.md` (30 min; then `pnpm verify:references`)
3. **Loom video (~30 min)** — record 4-min walkthrough using skeleton script
4. **3000-word report (~4-5 hours)** — distill from the 8 docs into required structure:
   - Introduction (300w)
   - Scenario Analysis (600w)
   - Data Model (600w)
   - Database Implementation (300w)
   - Data Reporting & Visualisation (600w)
   - Deployment & Maintenance (300w)
   - Conclusions (300w)
5. **Submit (~30 min)** — export PDF, proofread, verify ≤3000 words, upload to QM+ before Friday 8 May 2026, 23:59

**Target mark:** 95-99 / 100.
