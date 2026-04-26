# Analytical Queries

## Overview

YieldLens exposes four multi-table analytical SQL queries via tRPC, each supporting a specific investor decision. All queries are labelled with their S11 analytical technique classification.

| # | Query | S11 Label | Tables Joined | Key SQL Features | Decision Supported |
|---|-------|-----------|---------------|------------------|--------------------|
| Q1 | Comparables Analysis | Descriptive + Statistical | transaction, property, location (3) | PERCENTILE_CONT, CTE, CHECK constraints | Is the asking price fair? |
| Q2 | Historical Drill-Down | Descriptive + Predictive | transaction, property, location, hpi_index (4) | Window functions (LAG, AVG OVER ROWS), CTEs, UNION ALL | Is this area accelerating or decelerating? |
| Q3 | Composite Investment Score | Diagnostic | transaction, property, location, hpi_index, crime_stat, mortgage_product (6) | CTEs, NTILE(4), CASE, stored function call, CROSS JOIN | How good is this BTL investment overall? |
| Q4 | Quadrant Classification | Descriptive Classification | mv_postcode_investment_metrics (materialised view) | Precomputed NTILE, CASE quadrant bucketing | Which outcodes suit yield vs growth? |

## Q1 — Comparables Analysis

**S11 Classification:** Descriptive + Statistical

**Decision:** Is the asking price for this property fair relative to recent local sales?

**Tables:** transaction → property → location (3-table join)

**SQL Features:**
- CTE for filtered comparable set
- `PERCENTILE_CONT(0.25)`, `PERCENTILE_CONT(0.5)`, `PERCENTILE_CONT(0.75)` for distribution analysis
- Floor area ±20% range filter
- 24-month rolling window
- Composite index on `(outcode, sale_date DESC)` for performance

## Loshin BI Spectrum Justification

<!-- User writes: Justify Q1 against Loshin's BI maturity spectrum. Explain how percentile analysis moves beyond simple aggregation into statistical territory. -->

## Q2 — Multi-Level Historical Drill-Down

**S11 Classification:** Descriptive + Predictive

**Decision:** Has this area's price growth accelerated or decelerated vs its broader region?

**Tables:** transaction, property, location, hpi_index (4-table join)

**SQL Features:**
- Multiple CTEs for each geographic level (postcode sector, outcode, area, London region)
- `LAG(avg_price, 12) OVER (PARTITION BY geo_level ORDER BY month)` for year-on-year comparison
- `AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW)` for rolling 12-month average
- `UNION ALL` to combine 4 geographic levels
- Window frame specification (`ROWS BETWEEN`)

## Predictive Element Justification

<!-- User writes: Explain how rolling averages and YoY growth trends enable forward-looking inference. Reference time-series analysis literature. -->

## Q3 — Composite Investment Score (Hero Query)

**S11 Classification:** Diagnostic

**Decision:** Ranked by all factors combined, how good is this BTL investment?

**Tables:** transaction, property, location, hpi_index, crime_stat, mortgage_product (6 tables)

**SQL Features:**
- 7+ CTEs for modular computation
- `NTILE(4)` for percentile-based quartile scaling across all London outcodes
- `CASE` statement for verdict classification (UNICORN / CASH_COW / GROWTH_PLAY / AVOID)
- Calls `calculate_monthly_payment()` PL/pgSQL stored function
- Weighted composite: 35% yield + 25% growth + 20% risk + 20% cashflow
- `CROSS JOIN` to combine independent metric CTEs

## Diagnostic Justification

<!-- User writes: Explain how the composite score diagnoses investment quality by decomposing into weighted factors. Reference Loshin's diagnostic analytics definition. -->

## Q4 — Yield vs Growth Quadrant Classification

**S11 Classification:** Descriptive Classification

**Decision:** Which London outcodes are best for yield vs which for capital growth?

**Tables:** mv_postcode_investment_metrics (materialised view, precomputed from transaction + property + location + rental_index)

**SQL Features:**
- Reads from materialised view for sub-10ms response
- Precomputed `NTILE(4)` on yield and growth dimensions
- `CASE` bucketing into 2×2 matrix: CASH_COW (high yield, low growth), GROWTH_PLAY (low yield, high growth), UNICORN (high both), AVOID (low both)
- `UNIQUE INDEX` on outcode for fast lookups

## Classification Justification

<!-- User writes: Explain how the 2×2 quadrant classification supports strategic decision-making. Reference portfolio theory and diversification literature. -->

## Performance

All queries benchmarked at p50 < 200ms against the production Supabase Postgres instance. See `evidence/06-dashboard/performance-benchmarks.md` for full results.

## Literature Context

<!-- User writes: Broader literature justification for the analytical approach. Reference Loshin (2013), Elmasri & Navathe, and module lecture content on S11 analytical techniques. -->
