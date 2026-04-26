# Evidence Pack — Master Index

**Live URL:** https://yieldlens-opal.vercel.app
**GitHub:** https://github.com/harryfgx/yieldlens
**Loom Walkthrough:** _[placeholder — user records and pastes URL]_

## Evidence Files

| File | Description | Report Section | Appendix |
|------|-------------|---------------|----------|
| `evidence/01-erd/yieldlens-erd-uml.dbml` | DBML source for ERD (8 tables, 6 relationships) | Data Model | A1 |
| `evidence/01-erd/yieldlens-erd-uml.png` | ERD diagram exported from dbdiagram.io (HUMAN) | Data Model | A1 |
| `evidence/01-erd/supabase-studio-schema.png` | Supabase Studio schema visualiser (HUMAN) | Data Model | A1 |
| `evidence/02-schema-ddl/schema-full.sql` | Complete DDL — all Drizzle migrations concatenated | Data Model | A2 |
| `evidence/02-schema-ddl/advanced-features.sql` | Triggers, stored function, materialised view, role | Data Model | A2 |
| `evidence/02-schema-ddl/migrations/0000_even_shadowcat.sql` | Initial Drizzle migration (8 tables, 5 enums) | Data Model | A2 |
| `evidence/02-schema-ddl/migrations/0001_triggers_and_functions.sql` | Timestamp triggers on location + property | Data Model | A2 |
| `evidence/02-schema-ddl/migrations/0002_mortgage_function.sql` | `calculate_monthly_payment()` PL/pgSQL function | Data Model | A2 |
| `evidence/02-schema-ddl/migrations/0003_outcode_trigger.sql` | Outcode denormalisation trigger on transaction | Data Model | A2 |
| `evidence/02-schema-ddl/migrations/0004_materialised_view.sql` | `mv_postcode_investment_metrics` + refresh function | Data Model | A2 |
| `evidence/02-schema-ddl/migrations/0005_readonly_role.sql` | `app_readonly` role with least-privilege grants | Data Model | A2 |
| `evidence/03-data-sources/source-catalogue.md` | Data source catalogue with OGL v3.0 attribution | Data Sources | A3 |
| `evidence/03-data-sources/ingestion-logs/` | Structured JSON-line logs from ETL runs | Data Sources | A3 |
| `evidence/04-data-quality/dama-assessment.md` | DAMA quality assessment (6 dimensions) | Data Quality | A4 |
| `evidence/04-data-quality/quality-check-results.json` | Machine-readable quality check results (11 checks) | Data Quality | A4 |
| `evidence/05-sql-queries/q1-comparables.sql` | Q1: Comparables Analysis (Descriptive + Statistical) | Analytical Queries | A5 |
| `evidence/05-sql-queries/q1-comparables-explain.txt` | EXPLAIN ANALYZE output for Q1 | Analytical Queries | A5 |
| `evidence/05-sql-queries/q2-historical-drilldown.sql` | Q2: Multi-Level Historical Drill-Down (Descriptive + Predictive) | Analytical Queries | A5 |
| `evidence/05-sql-queries/q2-historical-drilldown-explain.txt` | EXPLAIN ANALYZE output for Q2 | Analytical Queries | A5 |
| `evidence/05-sql-queries/q3-composite-score.sql` | Q3: Composite Investment Score (Diagnostic) | Analytical Queries | A5 |
| `evidence/05-sql-queries/q3-composite-score-explain.txt` | EXPLAIN ANALYZE output for Q3 | Analytical Queries | A5 |
| `evidence/05-sql-queries/q4-quadrant.sql` | Q4: Yield vs Growth Quadrant (Descriptive Classification) | Analytical Queries | A5 |
| `evidence/05-sql-queries/q4-quadrant-explain.txt` | EXPLAIN ANALYZE output for Q4 | Analytical Queries | A5 |
| `evidence/06-dashboard/01-landing.png` | Landing page screenshot (1920×1080 @2x) | Dashboard | A6 |
| `evidence/06-dashboard/03-property-analyser.png` | Property analyser form screenshot | Dashboard | A6 |
| `evidence/06-dashboard/03-property-analyser-results.png` | Property analyser results screenshot | Dashboard | A6 |
| `evidence/06-dashboard/04-compare.png` | Compare page screenshot | Dashboard | A6 |
| `evidence/06-dashboard/05-historical-drilldown.png` | Historical drill-down screenshot | Dashboard | A6 |
| `evidence/06-dashboard/06-about-data.png` | About the data page screenshot | Dashboard | A6 |
| `evidence/06-dashboard/07-quadrant.png` | Quadrant scatter plot screenshot | Dashboard | A6 |
| `evidence/06-dashboard/08-crime-map.png` | Crime choropleth screenshot | Dashboard | A6 |
| `evidence/06-dashboard/axe-audit.json` | axe-core WCAG 2.1 AA accessibility audit (zero violations) | Quality Gates | A6 |
| `evidence/06-dashboard/lighthouse-desktop.json` | Lighthouse desktop audit (Performance/A11y/BP/SEO ≥ 90) | Quality Gates | A6 |
| `evidence/06-dashboard/performance-benchmarks.md` | Query performance benchmarks (p50/p95/p99) | Quality Gates | A6 |
| `evidence/06-dashboard/loom-script.md` | 4-minute walkthrough script with timestamps | Dashboard | A6 |
| `evidence/07-migrations-demo/expand-contract-example.md` | Expand-contract migration worked example | Deployment Plan | A7 |
| `evidence/08-deployment/vercel-deployment.png` | Vercel dashboard screenshot (HUMAN) | Deployment | A8 |
| `evidence/08-deployment/supabase-project.png` | Supabase project overview screenshot (HUMAN) | Deployment | A8 |
| `evidence/08-deployment/ci-pipeline-run.png` | GitHub Actions CI run screenshot (HUMAN) | Deployment | A8 |
| `evidence/09-README.md` | This file — master evidence index | All | — |
| `evidence/HUMAN_TODO.md` | Manual tasks checklist for user | — | — |
