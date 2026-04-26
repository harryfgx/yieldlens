# Technical Plan — YieldLens

## Product

**Name:** YieldLens
**One-liner:** A decision-support web application for UK buy-to-let investors evaluating London residential property investments.

**Users:** First-time BTL investors and small portfolio landlords (1-5 properties).

**Value proposition:** Produces actionable intelligence — composite investment score, comparables analysis, mortgage scenario modelling (interest-only vs repayment), and multi-level historical drill-down — for any London postcode or user-entered hypothetical property.

**Scenario authenticity:** Built around the lived experience of a first-time buyer who purchased shared ownership in Canada Water (SE16). The tool is the one that would have helped that decision.

## Tech Stack (LOCKED)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) via `create-t3-app` | Full-stack, serverless, Vercel-native |
| Language | TypeScript | Type safety, T3 default |
| Package manager | pnpm | T3 recommended, fast |
| ORM | Drizzle | Real SQL visibility for the report, clean migration files |
| Database | **Supabase Postgres** (London region) | Module-taught in Topic 9; free tier; Postgres under the hood |
| API | tRPC + Zod | T3 default, end-to-end type safety |
| UI components | shadcn/ui | WCAG 2.1 AA accessible via Radix primitives |
| Styling | Tailwind CSS | T3 default |
| Icons | Lucide | Ships with shadcn/ui |
| Charts | Tremor (primary) + Nivo (scatter + choropleth) | Dashboard-native aesthetic |
| Forms | React Hook Form + Zod | Type-safe, accessible |
| Date handling | date-fns | Time-series helpers |
| CSV parsing | csv-parse (Node) | For ETL pipeline |
| Env vars | @t3-oss/env-nextjs | T3 default, type-safe |
| Testing | Vitest | Faster than Jest, TS-native |
| Linting | ESLint + Prettier + eslint-plugin-jsx-a11y | Accessibility enforcement |
| Hosting | Vercel | Free, Next.js-native, preview deploys |
| CI | GitHub Actions | Free, integrates with Vercel |
| ERD | dbdiagram.io (DBML) | Versionable, Crow's foot + UML labels |
| Video | Loom | Free, embeddable |
| Analytics | Vercel Analytics | Free tier |

## Existing Infrastructure (already provisioned)

- **Supabase project:** `yieldlens` (ref: `scuggrmjkrrvciblekjj`, org: `axvcxtqefcjvbiycylwn`, region: West Europe / London)
- **Supabase DB password:** User has saved this securely; Ralph should fetch connection string via `supabase` CLI or prompt for it
- **GitHub account:** `harryfgx` (personal, authenticated via `gh` CLI)
- **Vercel account:** `harryfg` (authenticated via `vercel` CLI)
- **CLIs installed:** pnpm, vercel, gh, supabase
- **Node version:** v22.14.0
- **Git global config:** name=`Harry Goatcher`, email=`harryfg@amazon.com` (Amazon — MUST be overridden per-repo to `harryfgoatcher@gmail.com`)

## Registry constraint

npm global registry is set to Amazon CodeArtifact (`amazon-149122183214.d.codeartifact.us-west-2.amazonaws.com`). This breaks public package installs.

**Fix:** Create a `.npmrc` file in the project root on scaffold:
```
registry=https://registry.npmjs.org/
```
This scopes the public registry to this project only and doesn't affect Amazon work setup.

## Data Model (8 entities + 1 materialised view)

### Entities

1. **`location`** — postcode hierarchy
   - `location_id` PK (serial)
   - `postcode` (varchar, unique indexed)
   - `outcode` (varchar) — cached for joins; indexed
   - `borough` (varchar)
   - `region` (varchar)
   - `lsoa_code` (varchar) — for police.uk joins
   - `lat`, `lng` (numeric)
   - `created_at`, `updated_at` (timestamp with trigger)

2. **`property`** — physical property
   - `property_id` PK (serial)
   - `uprn` (bigint, unique) — Unique Property Reference Number from EPC/OS
   - `location_id` FK → location
   - `address_line_1`, `address_line_2`, `city` (varchar)
   - `property_type` (enum: DETACHED, SEMI_DETACHED, TERRACED, FLAT, OTHER)
   - `tenure` (enum: FREEHOLD, LEASEHOLD, SHARED_OWNERSHIP)
   - `bedrooms` (smallint, CHECK 0-20)
   - `floor_area_sqm` (numeric(8,2))
   - `epc_rating` (varchar)
   - `epc_score` (smallint)
   - `construction_age_band` (varchar)
   - `created_at`, `updated_at`

3. **`transaction`** — HM Land Registry sales
   - `transaction_id` PK (serial)
   - `property_id` FK → property
   - `outcode` (varchar) — **controlled denormalisation** for index performance; maintained by trigger from property.location.outcode; justified in Data Model section
   - `sale_price` (numeric(12,2), CHECK > 0 AND < 100000000)
   - `sale_date` (date, CHECK <= current_date)
   - `transaction_category` (enum: STANDARD_SALE, NEW_BUILD, OTHER)
   - `created_at`
   - Composite index: `(outcode, sale_date DESC)`

4. **`rental_index`** — ONS Private Rental Prices
   - `rental_index_id` PK
   - `region` (varchar) — joins to location.region or location.borough
   - `reference_month` (date, first of month)
   - `index_value` (numeric(8,2))
   - `monthly_pct_change` (numeric(5,2))
   - `annual_pct_change` (numeric(5,2))
   - Unique constraint: `(region, reference_month)`

5. **`hpi_index`** — ONS House Price Index
   - `hpi_index_id` PK
   - `outcode` (varchar) or `region` (varchar)
   - `reference_month` (date)
   - `average_price` (numeric(12,2))
   - `index_value` (numeric(8,2))
   - `annual_pct_change` (numeric(5,2))
   - Unique constraint: `(outcode, reference_month)` or `(region, reference_month)`

6. **`crime_stat`** — data.police.uk
   - `crime_stat_id` PK
   - `lsoa_code` (varchar, indexed)
   - `reference_month` (date)
   - `category` (varchar) — e.g., "anti-social-behaviour", "burglary"
   - `count` (integer, CHECK >= 0)
   - Unique constraint: `(lsoa_code, reference_month, category)`

7. **`mortgage_product`** — manually curated BTL rates
   - `mortgage_product_id` PK
   - `lender` (varchar) — e.g., "The Mortgage Works", "Paragon"
   - `product_name` (varchar)
   - `mortgage_type` (enum: INTEREST_ONLY, REPAYMENT)
   - `max_ltv_pct` (numeric(5,2)) — e.g., 75.00
   - `initial_rate_pct` (numeric(5,3)) — e.g., 5.495
   - `initial_period_months` (smallint)
   - `follow_on_rate_pct` (numeric(5,3))
   - `product_fee_gbp` (numeric(8,2))
   - `captured_at` (date) — date the rate was captured from lender page
   - `source_url` (varchar)

8. **`investor_scenario`** — persisted user what-ifs
   - `scenario_id` PK (uuid)
   - `shareable_slug` (varchar, unique) — for sharing
   - `target_postcode` (varchar)
   - `asking_price` (numeric(12,2))
   - `expected_monthly_rent` (numeric(10,2))
   - `deposit_pct` (numeric(5,2))
   - `mortgage_product_id` FK → mortgage_product
   - `composite_score` (numeric(5,2))
   - `verdict` (enum: CASH_COW, GROWTH_PLAY, UNICORN, AVOID)
   - `created_at`

### Materialised View

**`mv_postcode_investment_metrics`** — precomputed per outcode
- Median sale price (last 12 months)
- Avg yield estimate
- YoY price growth %
- 3-year price growth %
- Price volatility score
- Crime rate index
- Investment quadrant (NTILE 4)
- Refresh strategy documented (on-demand via admin endpoint; production would schedule nightly)

### Relationships (all UML multiplicity; Crow's foot labels as secondary)

- `location` 1..1 — 0..* `property`
- `property` 1..1 — 0..* `transaction`
- `location` 1..1 — 0..* `crime_stat` (via lsoa_code)
- `location` 0..* — 0..* `rental_index` (via region; join table not needed, direct FK on region)
- `location` 0..* — 0..* `hpi_index` (via outcode)
- `mortgage_product` 1..1 — 0..* `investor_scenario`

## Advanced Database Features ("beyond taught" — A+ criterion)

1. **Composite indexes**: `(outcode, sale_date DESC)` on transaction; `(lsoa_code, reference_month)` on crime_stat; partial indexes where appropriate
2. **Check constraints**: prices > 0 AND < 100M; bedrooms 0-20; dates not in future; percentage fields 0-100
3. **Audit columns with trigger**: `updated_at` auto-updated on every row mutation via `trigger_set_timestamp()` PL/pgSQL function
4. **Materialised view** with documented refresh strategy
5. **PL/pgSQL stored function**: `calculate_monthly_payment(principal, annual_rate, term_years, mortgage_type)` returning monthly payment using standard amortisation formula for repayment, simple interest for interest-only
6. **Enums** for property_type, tenure, transaction_category, mortgage_type, verdict
7. **Controlled denormalisation**: `outcode` on transaction (violates 3NF transitively) — justified in Data Model section with functional dependency analysis, maintained by trigger
8. **Least-privilege role**: `app_readonly` role that only has SELECT on tables and EXECUTE on the mortgage function — used by the app for all queries

## The 4 Analytical SQL Queries

Each is a real multi-table query supporting a real investor decision. Each labelled with its S11 technique.

### Q1 — Comparables Analysis (Descriptive + Statistical)
**Decision supported:** "Is the asking price for this property fair relative to recent local sales?"
**Joins:** `transaction` + `property` + `location` (3 tables)
**Features:** `PERCENTILE_CONT(0.25)`, `PERCENTILE_CONT(0.5)`, `PERCENTILE_CONT(0.75)` within a window; filters on outcode, bedrooms, property_type, floor area ±20%, sale_date within 24 months
**Output:** Distribution stats + £/sqft median + where target sits (percentile rank)

### Q2 — Multi-Level Historical Drill-Down (Descriptive + Predictive)
**Decision supported:** "Has this area's price growth accelerated or decelerated vs broader region?"
**Joins:** `transaction` + `property` + `location` + `hpi_index` (4 tables)
**Features:** CTEs, **window functions** (`LAG(avg_price, 12) OVER (PARTITION BY outcode ORDER BY month)`, `AVG(avg_price) OVER (PARTITION BY outcode ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW)`), YoY growth calculation
**Output:** 4 time series — postcode sector → outcode → area → region — with rolling 12-month avg and YoY %

### Q3 — Composite Investment Score (Diagnostic) — THE HERO QUERY
**Decision supported:** "Ranked by all factors combined, how good is this investment?"
**Joins:** `investor_scenario` + `property` + `location` + `transaction` + `crime_stat` + `mortgage_product` (6 tables)
**Features:** CTEs, `NTILE(4)` for percentile scaling of each factor, `CASE` statements (Topic 8 pattern) for verdict classification, **calls `calculate_monthly_payment()` stored function**, weighted composite score:
- 35% gross yield (based on comparables + rental_index)
- 25% capital growth (based on hpi_index trend)
- 20% risk (inverse of crime rate + price volatility)
- 20% cashflow (from mortgage scenario)
**Output:** Composite 0-100 score + verdict (CASH_COW, GROWTH_PLAY, UNICORN, AVOID) + component breakdown

### Q4 — Cash-Cow vs Growth Quadrant (Descriptive classification)
**Decision supported:** "Which London outcodes are best for yield vs which for capital growth?"
**Joins:** `transaction` + `property` + `location` + `rental_index` (or uses `mv_postcode_investment_metrics`)
**Features:** `NTILE(4)` on both yield and growth dimensions; `CASE` bucketing into 2x2 matrix
**Output:** Per-outcode classification into: CASH_COW (high yield, low growth), GROWTH_PLAY (low yield, high growth), UNICORN (high both), AVOID (low both)

## Data Sources (all real, free, OGL v3.0)

| Source | URL/Access | Use |
|---|---|---|
| HM Land Registry Price Paid Data | https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads | `transaction` table |
| ONS House Price Index | https://landregistry.data.gov.uk/app/ukhpi | `hpi_index` table |
| ONS Private Rental Prices Dataset | https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/privaterentalpricesindex | `rental_index` table |
| data.police.uk | https://data.police.uk/docs/ (free REST API) | `crime_stat` table |
| EPC Register | https://epc.opendatacommunities.org/ (free API with registration) | `property` attributes |
| ONS Postcodes Directory | https://geoportal.statistics.gov.uk/ | `location` geography |
| BTL mortgage rates | Manual capture from The Mortgage Works, Paragon, Kent Reliance public pages | `mortgage_product` — capture date stamped |

**Scope filter:** London only. Filter Land Registry to London postcodes (E, EC, N, NW, SE, SW, W, WC outcodes + outer London boroughs). Last 10 years.

**Target volumes:** ~1-2M transactions, ~50K HPI rows, ~10K rental rows, ~100K crime rows, ~200K EPC rows, 15 mortgage products.

## Dashboard Pages

1. **Home / Postcode Explorer** (`/`)
   - Hero: "Know if a London property is a good investment before you buy"
   - Postcode search input
   - Top-level area snapshot: avg yield, price trend (last 3 years), crime rate, school density
   - **One novel insight card** (e.g., "Outer London premium for low crime: £X/sqft")

2. **Property Analyser** (`/analyse`)
   - Form: postcode, bedrooms, property type, asking price, expected monthly rent, deposit %, mortgage product dropdown
   - Results: gross yield, net yield (after costs), monthly cashflow (IO), monthly cashflow (Repayment), comparables table, composite score, verdict

3. **Compare** (`/compare`)
   - Up to 4 postcodes side-by-side
   - Yield, growth, crime, composite score charts

4. **Historical Drill-Down** (`/history/[outcode]`)
   - 4 nested line charts — postcode → outcode → area → region

5. **About the Data** (`/about`)
   - Full source list with OGL attribution
   - Methodology notes
   - Known limitations

## Visualisations

| Viz | Library | Chart | Decision |
|---|---|---|---|
| Historical trend (multi-series) | Tremor | Line | Trend / timing |
| Yield distribution | Tremor | Box plot / histogram | Statistical comparison |
| Yield vs Growth quadrant | Nivo | Scatter with quadrant overlay | Classification |
| Crime by borough | Nivo | Choropleth (map) | Risk comparison |
| Mortgage cashflow (IO vs Repayment) | Tremor | Stacked bar | Cashflow decision |

All must be WCAG 2.1 AA compliant, mobile responsive, with proper alt text and keyboard navigation.

## Quality Gates

- **Accessibility:** WAVE + axe DevTools pass, no WCAG 2.1 AA violations
- **Performance:** p50 query latency < 200ms; Lighthouse score > 90 on desktop
- **Tests:** 3-4 Vitest tests on `calculateMonthlyPayment` utility (edge cases: zero deposit, max LTV, zero interest, IO vs Repayment parity)
- **Linting:** ESLint + Prettier clean; no a11y violations
- **Build:** Production build succeeds, deploys to Vercel

## Git / GitHub Conventions

- Repo: `harryfgx/yieldlens` (public)
- Licence: MIT
- Branch strategy: feature branches → PR → auto-deploy preview on Vercel → squash-merge to main → prod deploy
- Commits: Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `ci:`)
- Repo-scoped git config: `user.email=harryfgoatcher@gmail.com` (NOT global)

## Deployment & Maintenance Plan

- Frontend + serverless: Vercel
- Database: Supabase Postgres
- Migrations: Drizzle-generated SQL files in `drizzle/` folder, committed to git
- Schema change workflow: backward-compatible (expand then contract):
  1. Add new column/table (nullable, defaulted)
  2. Backfill data
  3. Update app code to write to new and read from new
  4. Remove old reads
  5. Remove old writes
  6. Drop old column/table in a later migration
- CI (GitHub Actions):
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - Apply migrations forward then backward on a fresh Postgres container per PR — this catches irreversible migrations before merge
- Backups: Supabase daily automated + PITR (up to 7 days on free tier)
- Security: env vars in Vercel, least-privilege DB role, no secrets in repo
- Rollback: Vercel instant rollback; Supabase PITR
- Change management theory cited in report: ITIL (Topic 4) + Kotter's 8-step (external, supplementary)
