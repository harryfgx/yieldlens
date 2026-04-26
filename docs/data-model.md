# YieldLens Data Model: Design and Normalisation

## Modelling Approach

<!-- User: cite Chen (1976) for ER origin, state UML multiplicity notation, justify by module organiser preference (Topic 6), levels: conceptual → logical → physical -->

## Entity Catalogue

### location

**Purpose:** Maps every London postcode to its geographic hierarchy — outcode, borough, region, and LSOA code — enabling spatial joins across all other entities.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| location_id | serial | Simple, Required | PK |
| postcode | varchar(10) | Simple, Required, Unique | — |
| outcode | varchar(6) | Simple, Required | — |
| borough | varchar(100) | Simple, Optional | — |
| region | varchar(100) | Simple, Optional | — |
| lsoa_code | varchar(20) | Simple, Optional | — |
| lat | numeric(9,6) | Simple, Optional | — |
| lng | numeric(9,6) | Simple, Optional | — |
| created_at | timestamptz | Simple, Required | — |
| updated_at | timestamptz | Simple, Required | — |

**Relationships:** 1..1 location — 0..* property; 1..1 location — 0..* crime_stat (via lsoa_code); 0..* location — 0..* rental_index (via region); 0..* location — 0..* hpi_index (via outcode)

### property

**Purpose:** Represents a physical property at a unique address/UPRN, with EPC attributes enriched post-ingestion.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| property_id | serial | Simple, Required | PK |
| uprn | bigint | Simple, Optional, Unique | — |
| location_id | integer | Simple, Required | FK → location |
| address_line_1 | varchar(255) | Simple, Optional | — |
| address_line_2 | varchar(255) | Simple, Optional | — |
| city | varchar(100) | Simple, Optional | — |
| property_type | property_type_enum | Simple, Optional | — |
| tenure | tenure_enum | Simple, Optional | — |
| bedrooms | smallint | Simple, Optional (CHECK 0–20) | — |
| floor_area_sqm | numeric(8,2) | Simple, Optional | — |
| epc_rating | varchar(5) | Simple, Optional | — |
| epc_score | smallint | Simple, Optional | — |
| construction_age_band | varchar(50) | Simple, Optional | — |
| created_at | timestamptz | Simple, Required | — |
| updated_at | timestamptz | Simple, Required | — |

**Relationships:** 1..1 property — 0..* transaction

### transaction

**Purpose:** Records HM Land Registry price-paid sales. The `outcode` column is a controlled denormalisation maintained by trigger (see Controlled Denormalisation section).

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| transaction_id | serial | Simple, Required | PK |
| property_id | integer | Simple, Required | FK → property |
| outcode | varchar(6) | Simple, Optional (trigger-maintained) | — |
| sale_price | numeric(12,2) | Simple, Required (CHECK > 0 AND < 100M) | — |
| sale_date | date | Simple, Required (CHECK ≤ CURRENT_DATE) | — |
| transaction_category | transaction_category_enum | Simple, Optional | — |
| created_at | timestamptz | Simple, Required | — |

### rental_index

**Purpose:** Stores ONS Private Rental Prices Index monthly data by region.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| rental_index_id | serial | Simple, Required | PK |
| region | varchar(100) | Simple, Required | — |
| reference_month | date | Simple, Required | — |
| index_value | numeric(8,2) | Simple, Optional | — |
| monthly_pct_change | numeric(5,2) | Simple, Optional | — |
| annual_pct_change | numeric(5,2) | Simple, Optional | — |

**Unique constraint:** (region, reference_month)

### hpi_index

**Purpose:** Stores ONS House Price Index monthly data by outcode for trend analysis.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| hpi_index_id | serial | Simple, Required | PK |
| outcode | varchar(6) | Simple, Required | — |
| reference_month | date | Simple, Required | — |
| average_price | numeric(12,2) | Simple, Optional | — |
| index_value | numeric(8,2) | Simple, Optional | — |
| annual_pct_change | numeric(5,2) | Simple, Optional | — |

**Unique constraint:** (outcode, reference_month)

### crime_stat

**Purpose:** Aggregated crime counts from data.police.uk by LSOA, month, and category.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| crime_stat_id | serial | Simple, Required | PK |
| lsoa_code | varchar(20) | Simple, Required | — |
| reference_month | date | Simple, Required | — |
| category | varchar(60) | Simple, Required | — |
| count | integer | Simple, Required (CHECK ≥ 0) | — |

**Unique constraint:** (lsoa_code, reference_month, category)

### mortgage_product

**Purpose:** Manually curated BTL mortgage products from major UK lenders, with capture date for auditability.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| mortgage_product_id | serial | Simple, Required | PK |
| lender | varchar(100) | Simple, Required | — |
| product_name | varchar(255) | Simple, Required | — |
| mortgage_type | mortgage_type_enum | Simple, Required | — |
| max_ltv_pct | numeric(5,2) | Simple, Optional | — |
| initial_rate_pct | numeric(5,3) | Simple, Optional | — |
| initial_period_months | smallint | Simple, Optional | — |
| follow_on_rate_pct | numeric(5,3) | Simple, Optional | — |
| product_fee_gbp | numeric(8,2) | Simple, Optional | — |
| captured_at | date | Simple, Optional | — |
| source_url | varchar(500) | Simple, Optional | — |

**Relationships:** 1..1 mortgage_product — 0..* investor_scenario

### investor_scenario

**Purpose:** Persisted user what-if scenarios with composite investment score and verdict classification.

**Classification:** Strong entity

| Attribute | Type | Category | PK/FK |
|---|---|---|---|
| scenario_id | uuid | Simple, Required (default gen_random_uuid()) | PK |
| shareable_slug | varchar(100) | Simple, Optional, Unique | — |
| target_postcode | varchar(10) | Simple, Optional | — |
| asking_price | numeric(12,2) | Simple, Optional | — |
| expected_monthly_rent | numeric(10,2) | Simple, Optional | — |
| deposit_pct | numeric(5,2) | Simple, Optional | — |
| mortgage_product_id | integer | Simple, Optional | FK → mortgage_product |
| composite_score | numeric(5,2) | Simple, Optional | — |
| verdict | verdict_enum | Simple, Optional | — |
| created_at | timestamptz | Simple, Required | — |

## Functional Dependency Analysis

<!-- User: explicit FDs for transaction, show transitive dependency via property → location -->

## Normalisation Walkthrough

### 1NF Check

<!-- User: confirm atomic values, unique rows, no repeating groups -->

### 2NF Check

<!-- User: confirm no partial dependencies (surrogate keys make 2NF automatic) -->

### 3NF Check

<!-- User: show transitive dependency on transaction.outcode -->

### BCNF Check

<!-- User: confirm every non-trivial FD has superkey on LHS, show one example -->

## Controlled Denormalisation

<!-- User: acknowledge 3NF violation for transaction.outcode, justify with quantitative argument, document integrity trigger -->

## Indexing Strategy

| Index Name | Table | Columns | Justification | Query Supported |
|---|---|---|---|---|
| location_pkey | location | location_id | Primary key lookup | All FK joins |
| location_postcode_unique | location | postcode | Unique constraint; postcode lookups during ingestion | Ingestion upserts |
| idx_location_outcode | location | outcode | Outcode-based filtering for area queries | Q1, Q2, Q4 |
| idx_location_postcode | location | postcode | Fast postcode search from user input | Home page search |
| property_pkey | property | property_id | Primary key lookup | Transaction joins |
| property_uprn_unique | property | uprn | Unique constraint; EPC enrichment by UPRN | EPC ingestion |
| transaction_pkey | transaction | transaction_id | Primary key lookup | — |
| idx_transaction_outcode_date | transaction | (outcode, sale_date DESC) | Composite covering index for outcode + date range scans | Q1 comparables, Q2 drill-down |
| uq_rental_index_region_month | rental_index | (region, reference_month) | Unique constraint + lookup by region and month | Q3 yield estimation |
| hpi_index_pkey | hpi_index | hpi_index_id | Primary key lookup | — |
| uq_hpi_outcode_month | hpi_index | (outcode, reference_month) | Unique constraint + outcode trend lookups | Q2 drill-down, Q3 growth |
| idx_hpi_outcode_date | hpi_index | (outcode, reference_month DESC) | Descending scan for latest HPI data per outcode | Q2, Q3, matview |
| crime_stat_pkey | crime_stat | crime_stat_id | Primary key lookup | — |
| idx_crime_stat_lsoa | crime_stat | lsoa_code | LSOA-based crime aggregation | Q3 risk, crime choropleth |
| uq_crime_lsoa_month_cat | crime_stat | (lsoa_code, reference_month, category) | Unique constraint; prevents duplicate ingestion | Crime ingestion |
| mortgage_product_pkey | mortgage_product | mortgage_product_id | Primary key lookup | Q3 mortgage calc |
| investor_scenario_pkey | investor_scenario | scenario_id | Primary key lookup | Scenario retrieval |
| investor_scenario_shareable_slug_unique | investor_scenario | shareable_slug | Unique constraint; slug-based sharing | Share URL lookup |
| mv_postcode_investment_metrics_outcode_idx | mv_postcode_investment_metrics | outcode | Unique index on matview for CONCURRENTLY refresh | Q4 quadrant, compare |
