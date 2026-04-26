# Lecture Content Synthesis

Extracted from the actual lecture slides delivered in IOT552U. These are the **exact frameworks, citations, and phrases** the module taught — using them scores alignment marks.

## Required module citations (use these, not generic alternatives)

| Source | Topic | Where to cite |
|---|---|---|
| **Codd, E.F. (1970)** 'A Relational Model of Data for Large Shared Data Banks', *CACM* | Topic 7 — SQL origin | Database Implementation intro |
| **Chen, P.P. (1976)** 'The entity-relationship model—toward a unified view of data', *ACM TODS* 1(1) | Topic 6 — ERD origin | Data Model intro |
| **Porter, M.E. (1985)** *Competitive Advantage*. Free Press | Topic 4 — competitive advantage via data | Introduction |
| **Elmasri, R. and Navathe, S.B. (2016)** *Fundamentals of Database Systems*, 7th edn | Topic 4 — database definition | Data Model / Database Implementation |
| **Beaulieu, A. (2020)** *Learning SQL*, 3rd edn, O'Reilly | Topic 7 — SQL textbook | Database Implementation |
| **Fernando, A.C. (2011)** *Business Environment*. Pearson India | Topic 1, 2 — business context | Introduction |
| **Laplante, P.A. and Kassab, M. (2022)** *Requirements Engineering for Software and Systems*. Auerbach | Topic 5 — elicitation techniques | Scenario Analysis |
| **Vlasceanu, V. et al. (2019)** *An Introduction to Cloud Databases*. O'Reilly | Topic 9 — cloud databases | Deployment |
| **Loshin, D. (2012)** *Business Intelligence: The Savvy Manager's Guide*. Morgan Kaufmann | Topic 14 — BI | Data Reporting |
| **Knaflic, C.N. (2015)** *Storytelling with Data*. Wiley | Topic 15 — visualisation principles | Data Reporting |
| **Wexler, S., Shaffer, J., Cotgreave, A. (2017)** *The Big Book of Dashboards*. Wiley | Topic 14 — dashboards | Data Reporting |
| **Vergadia, P. and Lakshmanan, V. (2025)** *Visualizing Generative AI*. O'Reilly | Topic 16 — GenAI | Database Implementation (AI-assisted SQL disclosure) |

## Topic-by-topic distilled content

### Topic 1 — Organisational Environment
- Organisation: cooperation, coordination, division of labour (James 2017)
- Business environment: internal/external, micro/macro, economic/non-economic
- Non-economic factors: political-legal, socio-cultural (Fernando 2011)
- UK Online Safety Act as contemporary example

### Topic 2 — Strategic Planning
- **SWOT** (Strengths, Weaknesses, Opportunities, Threats) — CIPD resource
- **PESTLE** (Political, Economic, Sociological, Technological, Legal, Environmental) — CIPD resource
- Porter: "essence of strategy is choosing what not to do"
- Strategic planning scope: long vs short term, corporate vs departmental, growth vs competitive
- Questions to ask software providers: data location, access, encryption at rest/transit, backups, recovery, version control, release cadence, deployment process, dev team size, automated testing

### Topic 3 — Journey Mapping & Capability Mapping
- **NN/g user journey mapping** method: Actor, Scenario + Expectations, Journey Phases, Actions/Mindsets/Emotions, Opportunities
- Journey Phases examples: discover/try/buy/use/seek support; purchase/adoption/retention/expansion/advocacy
- **Business Capability Maps**: describe "what" not "how"; outcomes, definitions, intent, tangible/intangible
- Tools: Draw.io, Miro, Lucidchart

### Topic 4 — Databases & Data Management Systems
- Data classifications: structured, unstructured, semi-structured
- Porter (1985) on data as competitive advantage
- **Bain & Company (2013)**: advanced analytics firms are 2x more likely to be top-quartile financial performers, 5x faster decisions, 3x better execution
- BI workflow framing
- **ITSM** (IT Service Management), **ITIL** (framework), **ITAM** (asset management), **CMDB** (configuration management database)
- Real-world failures: Google Flu Trends, Solid Gold Bomb, Post Office Horizon
- Spurious correlations: Ronald Coase — "if you torture the data long enough, it will confess to anything"

### Topic 5 — Requirements Analysis
- **3 types of requirements** (IBM framework): business, user/stakeholder, system
- **3 categories**: functional, non-functional, domain
- **Requirements Management Process**: elicitation → analysis → definition → prioritisation → approval → traceability → change requests → validation → change management → revisions → document updates
- **Elicitation techniques (Laplante & Kassab 2022)**: domain analysis, brainstorming, crowdsourcing, card sorting, designer as apprentice, ethnographic observation, interviews, **introspection**, questionnaires, prototyping, scenarios, use cases, user stories
- **Introspection justification**: Laplante & Kassab explicitly states this is appropriate when users are busy OR when the requirements engineer's domain knowledge far exceeds the customer's — this is our legitimate reason for NOT doing user interviews
- MoSCoW is implied via prioritisation slide

### Topic 6 — Data Modelling & ERDs
- Chen (1976) as ER modelling origin
- Notation variants: IE (Information Engineering), Barker-Ellis, IDEF1X, UML
- **Jonathan Jackson's stated preference: UML multiplicity notation over Crow's Feet**
- Modelling levels: conceptual → logical → physical
- Strong vs weak entities
- Attribute types: simple vs composite, single vs multivalued, required vs optional, derived
- Cardinalities vs multiplicities: `1..1`, `0..1`, `0..*`, `1..*`, specific ranges like `1..5`

### Topic 7 — SQL
- Codd (1970) foundational paper
- Procedural vs nonprocedural language
- RDBMS examples: Oracle, SQL Server, DB2, **PostgreSQL**, MySQL, MariaDB
- Core statements: CREATE TABLE, INSERT, UPDATE, SELECT, ALTER, DROP
- Multi-table JOINs via foreign keys

### Topic 8 — Intermediate SQL (Zenz, Learning SQL Ch 6-9)
- **Set theory**: UNION, INTERSECT, EXCEPT, UNION ALL
- **Subqueries**: noncorrelated, correlated
  - `= (SELECT ...)` single value
  - `IN (SELECT ...)`, `NOT IN`
  - `> ANY`, `> ALL`, `EXISTS`
  - Multi-column subqueries
- **Joins**: INNER, LEFT OUTER, RIGHT OUTER, CROSS
- **Conditional logic — CASE**: categorise/sum, protect denominator, conditional updates, handling NULL
- "What we are really doing in SQL queries is expressing logical relationships between sets and their elements"

### Topic 9 — Cloud Databases
- Self-managed vs managed vs cloud-native (e.g., Amazon Aurora)
- **Supabase** taught with full walkthrough — "just Postgres" under the hood
- Shared responsibility model (Supabase docs)
- DBA role shift: less operational, more design/governance
- Inverted DBA role in cloud

### Topic 10 — Normalisation (Zenz)
- **Codd's Relational Model** (1970) foundation
- Functional dependency — x → y
- Superkeys, candidate keys, primary keys
- **1NF**: atomic values, unique rows, single-type columns, no repeating groups
- **2NF**: no partial dependency on composite keys
- **3NF**: no transitive dependency (non-prime → non-prime)
- **BCNF**: every non-trivial FD has superkey LHS
- **4NF**: multivalued dependencies
- Insertion/deletion anomalies

### Topic 13 — Data-Driven Decisions (Gunton)
- Aims of analysis: discover patterns, estimate, predict, test hypotheses, understand causes
- **S11 techniques taxonomy**:
  - **Semantic** (text, qualitative, thematic coding, language modelling)
  - **Diagnostic** (deeper analysis to find causes)
  - **Predictive** (classification, regression, forecasts, time-series)
  - **Statistical** (linear models, regression, chi-squared, bootstrapping, NHT, model comparison, Bayesian)
  - **Descriptive** (summary stats, charts, clustering, dimension reduction)
- Null hypothesis testing, Type I/II errors, power

### Topic 14 — BI Dashboards
- **Loshin's definition**: "processes, technologies, and tools needed to turn data into information, information into knowledge, and knowledge into plans that drive profitable business action"
- **Actionable intelligence**: "Discovered knowledge is of little value if there is no value-producing action"
- **BI Analysis Spectrum** (left → right): Reports → Ad Hoc → **Dashboards** → Statistical Analysis → Forecasting Models → Planning → Predictive Models → Optimizing Models
  - Questions: What happened? → Why? → What if? → What next? → How?
- BI platforms rely on data warehouses
- Tools mentioned: Excel, PowerBI, Tableau, Grafana, Looker, Amazon QuickSight
- **Ask your data "why"** pattern (Wexler et al 2017)

### Topic 15 — Visualisations (Gunton/Jackson)
- **Knaflic (2015)** *Storytelling with Data* Ch 2 — set reading
- Make efficient graphs: text, colours (monochrome default), distances, legend
- Good: bar charts (stacked, clustered), boxplots, scatter plots
- Bad: 3-D pie charts, meaningless depth, superfluous legends
- Descriptive stats: median/mean/mode, range/IQR/SD
- Scatterplots for paired quantitative variables
- PCA for dimension reduction

### Topic 16 — GenAI
- Vergadia & Lakshmanan (2025) — transformer architecture, RLHF
- Vaswani et al (2017) "Attention is all you need"
- RAG (Retrieval-Augmented Generation)
- Agentic AI — models, tools, memory, orchestration
- MCP (Model Context Protocol)
- **Assessment note from lecturer**: 001 Task 4 analysed GenAI usage — no statistically significant performance difference between GenAI and non-GenAI users

## Phrases to use verbatim in the report

- "actionable intelligence" (Loshin 2012)
- "BI Analysis Spectrum" (Loshin 2012)
- "competitive advantage" (Porter 1985)
- "highly refined capability" (from mark scheme wording — show this in Scenario Analysis)
- Requirements "type" (business/user/system) and "category" (functional/non-functional/domain)
- S11 technique names when labelling queries: Descriptive, Statistical, Diagnostic, Predictive

## Frameworks to explicitly name

| Framework | Section | Source |
|---|---|---|
| CRISP-DM | Scenario Analysis (methodology framing) | Industry standard |
| SWOT | Scenario Analysis (competitive analysis) | Topic 2 |
| MoSCoW | Scenario Analysis (prioritisation) | Standard agile |
| User Journey Map (NN/g) | Scenario Analysis (current-state) | Topic 3 |
| Use Cases & User Stories | Scenario Analysis | Topic 5, Laplante & Kassab |
| Introspection | Scenario Analysis (justifying no user interviews) | Topic 5, Laplante & Kassab |
| Secondary domain analysis | Scenario Analysis (using industry reports) | Topic 5 |
| 3 types of requirements | Scenario Analysis | Topic 5, IBM |
| 3 categories of requirements | Scenario Analysis | Topic 5 |
| Chen (1976) ER modelling | Data Model | Topic 6 |
| UML multiplicity notation | Data Model ERD | Topic 6, Jackson's preference |
| 1NF → 2NF → 3NF → BCNF | Data Model | Topic 10, Zenz |
| DAMA 6 dimensions | Database Implementation (data quality) | Industry standard |
| ITIL change management | Deployment | Topic 4 |
| Kotter 8-step (optional) | Deployment | External, supplements ITIL |
| BI Analysis Spectrum | Data Reporting | Topic 14, Loshin |
| S11 technique taxonomy | Data Reporting (labelling queries) | Topic 13, Gunton |
