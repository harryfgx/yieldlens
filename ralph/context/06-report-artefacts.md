# Report Artefacts — Markdown Files Ralph Must Produce

These are the pre-written artefacts Ralph produces so the user can paste them directly into the report or reference them from appendices. Each one maps to a specific mark scheme criterion.

All files go under `docs/` in the repo (checked into git) and **also** mirrored to `evidence/` for the final handoff.

## Required files + exact structure

### 1. `docs/research-questions.md` → supports Introduction section

Required content:
- Heading: "Research Questions"
- Exactly 3 numbered questions, each matching one of the 4 analytical queries:
  1. "How do rental yields and capital growth vary across London outcodes over the last 10 years?" → Q1 + Q2
  2. "What is the net-cashflow impact of interest-only vs repayment BTL mortgages on typical London investments under current rates?" → Q3
  3. "Can a composite multi-factor score meaningfully differentiate London outcodes into cash-cow vs growth investment strategies?" → Q3 + Q4
- One paragraph (~80 words) justifying each question using market context (Section 24 tax changes, affordability, minimum EPC regulations)

### 2. `docs/scenario-swot.md` → supports Scenario Analysis section (K4, Topic 2)

Required content:
- Heading: "SWOT Analysis of Existing UK BTL Decision-Support Tools"
- Introductory paragraph naming the competitors analysed: PaTMa, Property Investment Project (propertyinvestmentproject.co.uk), BiggerPockets (US but used by UK investors), Rightmove built-in calculator
- Four-quadrant SWOT table (Markdown table) with 3-5 items per quadrant
  - Strengths column: what competitors do well
  - Weaknesses column: where they fall short (feeds directly into our opportunity)
  - Opportunities column: market gaps YieldLens targets
  - Threats column: risks to YieldLens if built (paid-API competitors, data licensing shifts, market changes)
- Final paragraph (50 words): how SWOT findings shaped YieldLens' MoSCoW priorities

### 3. `docs/user-journey-map.md` → supports Scenario Analysis section (K4, Topic 3)

Required content:
- Heading: "Current-State User Journey Map: First-Time BTL Investor Evaluating a Property"
- Introductory paragraph naming the NN/g journey-mapping method and citing Topic 3
- Persona block: named persona (fictional, non-PII), age, financial context, motivation
- Scenario + Expectations block: one paragraph
- Journey phases (exactly these 5, in a table): DISCOVER → RESEARCH → EVALUATE → DECIDE → ACT
- For each phase, columns: Actions | Mindset/Thoughts | Emotions (emoji + word) | Pain Points | Opportunities
- Final "Opportunities → Features" section: a bullet list mapping each pain point to a specific YieldLens feature (e.g., "Jumping between Rightmove, data.police.uk, and ONS → YieldLens unifies these")

### 4. `docs/risk-register.md` → supports Scenario Analysis section (K3)

Required content:
- Heading: "Project Risk Register"
- Introductory sentence citing K3 (risks and opportunities of digital solutions)
- Markdown table with exactly these columns: ID | Risk | Likelihood (H/M/L) | Impact (H/M/L) | Mitigation | Residual Risk
- Exactly 5 rows, covering:
  - R1: Data freshness (Land Registry has 1-3 month lag)
  - R2: Market volatility (historical patterns may not predict future returns)
  - R3: Legal/licensing (OGL compliance, no scraped data)
  - R4: Technical dependency (Supabase free tier limits, API rate limits)
  - R5: Scope creep (temptation to add live listings, ML, etc.)

### 5. `docs/requirements-analysis.md` → supports Scenario Analysis section (S1, S3, Topic 5)

Required content:
- Heading: "Requirements Analysis Methodology"
- Section 1: "Elicitation Techniques Used" — lists each technique applied, cites Laplante & Kassab (2022), justifies choice
  - Introspection (with explicit justification: "Laplante & Kassab explicitly recommend introspection when the requirements engineer's domain knowledge exceeds the customer's OR when users are unavailable")
  - Secondary domain analysis (industry reports: Paragon, NRLA, Hamptons, UK Finance — cited with year)
  - Competitive analysis via SWOT (ref: `docs/scenario-swot.md`)
  - User journey mapping (ref: `docs/user-journey-map.md`)
  - Scenarios and use cases
- Section 2: "Requirements Types" — uses the IBM framework (Topic 5)
  - Business requirements: 3 bullets
  - User/stakeholder requirements: 3 bullets
  - System/technical requirements: 3 bullets
- Section 3: "Requirements Categories" — exactly this table:
  - Columns: ID | Requirement | Category (Functional / Non-functional / Domain) | MoSCoW (Must/Should/Could/Won't)
  - Minimum 10 requirements covering all 3 categories
  - Must include at least 2 Won't-have items (e.g., "Live property listings feed" with justification "no free compliant UK API exists per Topic 4 lecture material")
- Section 4: "Use Cases" — 3 primary use cases using this format:
  - UC-1: First-time investor evaluates a specific property
  - UC-2: Portfolio landlord compares 4 candidate postcodes
  - UC-3: Researcher drills down historical trends for an area
  - For each: Actor, Preconditions, Main Flow (numbered steps), Postconditions

### 6. `docs/data-model.md` → supports Data Model section (Topic 6, Topic 10)

Required content:
- Heading: "YieldLens Data Model: Design and Normalisation"
- Section 1: "Modelling Approach"
  - Citation of Chen (1976) for ER origin
  - Statement of chosen notation: **UML multiplicity** (primary), Crow's Foot (secondary) — justified by module organiser preference (cite Topic 6)
  - Levels modelled: conceptual → logical → physical
- Section 2: "Entity Catalogue" — one subsection per entity (8 entities) with:
  - Name + purpose
  - Entity classification: strong vs weak (per Topic 6)
  - Attribute catalogue: name | type | category (simple/composite/single/multivalued/required/optional/derived) | PK/FK flag
  - Relationships with multiplicities
- Section 3: "Functional Dependency Analysis for `transaction`"
  - Explicit FDs listed: `transaction_id → property_id, sale_price, sale_date, transaction_category, outcode`; `property_id → location_id → outcode, borough, region`
  - Reasoning that `outcode` has a transitive dependency via property → location (3NF violation)
- Section 4: "Normalisation Walkthrough"
  - Subsection 4.1: "1NF Check" — confirm atomic values, unique rows, no repeating groups
  - Subsection 4.2: "2NF Check" — confirm no partial dependencies on composite keys (we use surrogate keys, so 2NF is automatic)
  - Subsection 4.3: "3NF Check" — show the transitive dependency that exists (outcode on transaction) and name it explicitly
  - Subsection 4.4: "BCNF Check" — confirm every non-trivial FD has a superkey on the LHS for the main entities; show one example
  - Cite Elmasri & Navathe (2016) and Codd (1970) for normalisation theory
- Section 5: "Controlled Denormalisation: `transaction.outcode`"
  - Acknowledge this deliberately violates 3NF
  - Justify with a quantitative argument: without the cached outcode, Q2 (historical drill-down) would require a 3-table join on every window function pass, making query plans an order of magnitude slower
  - Document the integrity trigger that enforces `transaction.outcode = (SELECT outcode FROM location WHERE location.location_id = (SELECT location_id FROM property WHERE property.property_id = transaction.property_id))` on INSERT and UPDATE
- Section 6: "Indexing Strategy"
  - Table of every index with: name | columns | justification | query it supports

### 7. `docs/analytical-queries.md` → supports Data Reporting section (S11, Topic 13, Topic 14)

Required content:
- Heading: "Analytical Queries and Data Reporting Strategy"
- Opening paragraph positioning the project on **Loshin's BI Analysis Spectrum** (cite Loshin 2012, Topic 14): "This project targets the Dashboard tier, extending into Statistical Analysis via the composite scoring query. It produces what Loshin (2012) terms **actionable intelligence**."
- Section per query (Q1–Q4). Each section contains:
  - Query name
  - Decision it supports (one sentence)
  - **S11 technique label** (Descriptive / Statistical / Diagnostic / Predictive — cite Gunton Topic 13)
  - Tables joined (count + list)
  - SQL features used (window functions, CTEs, NTILE, CASE, etc.)
  - Literature justification for the associated visualisation, citing one or more of: Knaflic (2015), Wexler, Shaffer & Cotgreave (2017)

### 8. `docs/deployment-plan.md` → supports Deployment and Maintenance section (S8, Topic 4, Topic 9)

Required content:
- Heading: "Deployment and Maintenance Plan"
- Section 1: "Infrastructure Choice"
  - Supabase Postgres + Vercel serverless
  - Justification citing Vlasceanu et al (2019) on cloud DB trade-offs
  - Comparison against self-managed and pre-existing organisational infrastructure
- Section 2: "Environments and CI/CD"
  - Dev → Vercel preview → production
  - GitHub Actions pipeline description
- Section 3: "Backward-Compatible Schema Migrations (Expand-Contract)"
  - Step-by-step description of the 5-step pattern
  - Concrete worked example: "Renaming `property.address_line_1` to `property.primary_address_line`"
  - Full SQL snippets for each of the 5 migration steps
- Section 4: "Change Management Theory"
  - Cite **ITIL change management** (Topic 4) as the organisational framework
  - Cite **Kotter's 8-step model** as a supporting stakeholder-adoption framework
  - Explain how ITIL's "Normal vs Standard vs Emergency" change categories apply to schema migrations in YieldLens (most migrations are Standard; breaking changes are Normal and require approval)
- Section 5: "Security and Integrity Safeguards"
  - Environment variable management (Vercel env vars)
  - Least-privilege DB role (`app_readonly`)
  - Point-in-time recovery via Supabase
  - Audit columns on every table
  - CI forward-then-backward migration test preventing irreversible changes
- Section 6: "Rollback Plan"
  - Vercel instant previous-deploy rollback
  - Supabase PITR up to 7 days

### 9. `docs/evidence-index.md` → mirrors `evidence/09-README.md` but lives in `docs/` too for git visibility

Just a symlink or a copy. Ralph should use copy-on-completion not symlink to simplify.

### 10. `docs/AGENTS.md` → guidance for future Ralph iterations (already noted in US-001)

Required content:
- Registry override (npm uses Amazon CodeArtifact globally; `.npmrc` must exist in this repo)
- Git identity override (global is Amazon email; repo-scoped must be personal)
- Supabase project ref: `scuggrmjkrrvciblekjj`
- Connection string sources: `~/personal/yieldlens/.secrets/db.env` (never commit)
- DATABASE_URL vs DIRECT_URL usage rules
- Test DB strategy (reuse dev Supabase for now)
- How to run ingestion, how to refresh materialised view

## How Ralph produces these

Each of these files is produced by the appropriate user story:
- `docs/research-questions.md` → US-001 or US-002 (early, used throughout)
- `docs/scenario-swot.md` → US-001 (document only; content based on context)
- `docs/user-journey-map.md` → US-001 (document only)
- `docs/risk-register.md` → US-001 (document only)
- `docs/requirements-analysis.md` → US-001 (document only)
- `docs/data-model.md` → US-002 (produced alongside the schema)
- `docs/analytical-queries.md` → US-004 (produced alongside the queries)
- `docs/deployment-plan.md` → US-008 (produced during final polish)
- `docs/AGENTS.md` → US-001 (produced at scaffold)

These documents exist to give the user everything they need for the 3000-word report without rewriting. The user copies-paraphrases-cites-trims into the final report.
