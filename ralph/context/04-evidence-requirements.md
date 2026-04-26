# Evidence Pack Requirements

Ralph must capture evidence for the report's appendices as it builds. Each item below is referenced from the main body of the report and is therefore non-negotiable.

## Capture locations

Place all evidence artefacts in `./evidence/` at the repo root:

```
evidence/
  01-erd/
    yieldlens-erd-uml.png            # Primary ERD (dbdiagram.io export, UML multiplicity)
    yieldlens-erd-uml.dbml           # DBML source, version-controlled
    supabase-studio-schema.png       # Secondary ERD from Supabase Studio schema visualiser
  02-schema-ddl/
    schema-full.sql                  # Complete DDL (concatenated from Drizzle migrations)
    migrations/                      # Copies of individual migration files
    advanced-features.sql            # Indexes, constraints, triggers, function, view, role
  03-data-sources/
    source-catalogue.md              # Table of sources with OGL attribution, volumes, refresh
    ingestion-logs/                  # Output from ETL runs
  04-data-quality/
    dama-assessment.md               # 6 dimensions worked through
    quality-check-results.json       # Machine output from quality checks
  05-sql-queries/
    q1-comparables.sql
    q1-comparables-explain.txt       # EXPLAIN ANALYZE output
    q2-historical-drilldown.sql
    q2-historical-drilldown-explain.txt
    q3-composite-score.sql
    q3-composite-score-explain.txt
    q4-quadrant.sql
    q4-quadrant-explain.txt
  06-dashboard/
    01-landing.png
    02-postcode-explorer.png
    03-property-analyser.png
    04-compare.png
    05-historical-drilldown.png
    06-about-data.png
    lighthouse-desktop.json          # Lighthouse score output
    axe-audit.json                   # Accessibility audit output
    performance-benchmarks.md        # p50/p95/p99 query latencies
  07-migrations-demo/
    expand-contract-example.md       # Worked example of a backward-compat migration
  08-deployment/
    vercel-deployment.png
    supabase-project.png
    ci-pipeline-run.png              # GitHub Actions run screenshot
  09-README.md                       # Index of evidence with cross-references
```

## Screenshot specifications

All screenshots:
- Minimum 1920x1080 for desktop shots
- High DPI (Retina screenshots are ideal)
- PNG format, not JPEG
- No personal info visible (email, session data, etc.)
- Clean browser (no dev tools unless showing dev tools intentionally)

## Loom walkthrough script (for Ralph to prepare, user records manually later)

Ralph should produce `./evidence/06-dashboard/loom-script.md` with:
- 0-15s: Hook — the BTL investor problem
- 15-45s: What the app does (one-screen tour of homepage)
- 45s-2m: Walk through a real query — "Let's analyse a property in SE16"
- 2-3m: Show the novel insight
- 3-4m: Show the code/SQL briefly — the ERD, the composite score query
- Outro: What I learned building this

## Documentation evidence

Ralph must maintain a clear commit history and push artefacts to the public GitHub repo so the report can link to:
- Live dashboard URL (Vercel)
- Public GitHub repo URL
- Specific commit SHAs for key milestones
- Specific file permalinks for SQL queries, schema, migration files

## Verification before marking Phase 7 complete

- [ ] All 9 evidence folders populated
- [ ] All screenshots present and clear
- [ ] All SQL queries have EXPLAIN ANALYZE output captured
- [ ] Lighthouse report shows >90 desktop score
- [ ] Axe audit shows zero WCAG 2.1 AA violations
- [ ] Performance benchmarks documented
- [ ] Deployment evidence captured (Vercel + Supabase + CI)
- [ ] `evidence/09-README.md` is a complete index with descriptions
