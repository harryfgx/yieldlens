CREATE TYPE "public"."mortgage_type_enum" AS ENUM('INTEREST_ONLY', 'REPAYMENT');--> statement-breakpoint
CREATE TYPE "public"."property_type_enum" AS ENUM('DETACHED', 'SEMI_DETACHED', 'TERRACED', 'FLAT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."tenure_enum" AS ENUM('FREEHOLD', 'LEASEHOLD', 'SHARED_OWNERSHIP');--> statement-breakpoint
CREATE TYPE "public"."transaction_category_enum" AS ENUM('STANDARD_SALE', 'NEW_BUILD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."verdict_enum" AS ENUM('CASH_COW', 'GROWTH_PLAY', 'UNICORN', 'AVOID');--> statement-breakpoint
CREATE TABLE "crime_stat" (
	"crime_stat_id" serial PRIMARY KEY NOT NULL,
	"lsoa_code" varchar(20) NOT NULL,
	"reference_month" date NOT NULL,
	"category" varchar(60) NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "chk_crime_count" CHECK (count >= 0)
);
--> statement-breakpoint
CREATE TABLE "hpi_index" (
	"hpi_index_id" serial PRIMARY KEY NOT NULL,
	"outcode" varchar(6) NOT NULL,
	"reference_month" date NOT NULL,
	"average_price" numeric(12, 2),
	"index_value" numeric(8, 2),
	"annual_pct_change" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "investor_scenario" (
	"scenario_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shareable_slug" varchar(100),
	"target_postcode" varchar(10),
	"asking_price" numeric(12, 2),
	"expected_monthly_rent" numeric(10, 2),
	"deposit_pct" numeric(5, 2),
	"mortgage_product_id" integer,
	"composite_score" numeric(5, 2),
	"verdict" "verdict_enum",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investor_scenario_shareable_slug_unique" UNIQUE("shareable_slug")
);
--> statement-breakpoint
CREATE TABLE "location" (
	"location_id" serial PRIMARY KEY NOT NULL,
	"postcode" varchar(10) NOT NULL,
	"outcode" varchar(6) NOT NULL,
	"borough" varchar(100),
	"region" varchar(100),
	"lsoa_code" varchar(20),
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_postcode_unique" UNIQUE("postcode")
);
--> statement-breakpoint
CREATE TABLE "mortgage_product" (
	"mortgage_product_id" serial PRIMARY KEY NOT NULL,
	"lender" varchar(100) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"mortgage_type" "mortgage_type_enum" NOT NULL,
	"max_ltv_pct" numeric(5, 2),
	"initial_rate_pct" numeric(5, 3),
	"initial_period_months" smallint,
	"follow_on_rate_pct" numeric(5, 3),
	"product_fee_gbp" numeric(8, 2),
	"captured_at" date,
	"source_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "property" (
	"property_id" serial PRIMARY KEY NOT NULL,
	"uprn" bigint,
	"location_id" integer NOT NULL,
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"property_type" "property_type_enum",
	"tenure" "tenure_enum",
	"bedrooms" smallint,
	"floor_area_sqm" numeric(8, 2),
	"epc_rating" varchar(5),
	"epc_score" smallint,
	"construction_age_band" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "property_uprn_unique" UNIQUE("uprn")
);
--> statement-breakpoint
CREATE TABLE "rental_index" (
	"rental_index_id" serial PRIMARY KEY NOT NULL,
	"region" varchar(100) NOT NULL,
	"reference_month" date NOT NULL,
	"index_value" numeric(8, 2),
	"monthly_pct_change" numeric(5, 2),
	"annual_pct_change" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"transaction_id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"outcode" varchar(6),
	"sale_price" numeric(12, 2) NOT NULL,
	"sale_date" date NOT NULL,
	"transaction_category" "transaction_category_enum",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_sale_price" CHECK (sale_price > 0 AND sale_price < 100000000),
	CONSTRAINT "chk_sale_date" CHECK (sale_date <= CURRENT_DATE)
);
--> statement-breakpoint
ALTER TABLE "investor_scenario" ADD CONSTRAINT "investor_scenario_mortgage_product_id_mortgage_product_mortgage_product_id_fk" FOREIGN KEY ("mortgage_product_id") REFERENCES "public"."mortgage_product"("mortgage_product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_location_id_location_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_property_id_property_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("property_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crime_stat_lsoa" ON "crime_stat" USING btree ("lsoa_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_crime_lsoa_month_cat" ON "crime_stat" USING btree ("lsoa_code","reference_month","category");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_hpi_outcode_month" ON "hpi_index" USING btree ("outcode","reference_month");--> statement-breakpoint
CREATE INDEX "idx_hpi_outcode_date" ON "hpi_index" USING btree ("outcode","reference_month" DESC);--> statement-breakpoint
CREATE INDEX "idx_location_outcode" ON "location" USING btree ("outcode");--> statement-breakpoint
CREATE INDEX "idx_location_postcode" ON "location" USING btree ("postcode");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_rental_index_region_month" ON "rental_index" USING btree ("region","reference_month");--> statement-breakpoint
CREATE INDEX "idx_transaction_outcode_date" ON "transaction" USING btree ("outcode","sale_date" DESC);-- 0001: Audit timestamp trigger function + triggers on location and property
-- Automatically sets updated_at = NOW() on every UPDATE.

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_location
  BEFORE UPDATE ON "location"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_property
  BEFORE UPDATE ON "property"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
-- 0002: Stored function — calculate_monthly_payment
-- Used by Q3 (Composite Investment Score) to compute mortgage payments.
-- IMMUTABLE: same inputs always produce same output.

CREATE OR REPLACE FUNCTION calculate_monthly_payment(
  principal numeric,
  annual_rate_pct numeric,
  term_years integer,
  mortgage_type text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r numeric;
  n integer;
BEGIN
  IF principal = 0 THEN
    RETURN 0;
  END IF;

  IF mortgage_type = 'INTEREST_ONLY' THEN
    RETURN ROUND(principal * annual_rate_pct / 100.0 / 12.0, 2);
  END IF;

  -- REPAYMENT
  n := term_years * 12;

  IF annual_rate_pct = 0 THEN
    RETURN ROUND(principal / n, 2);
  END IF;

  r := annual_rate_pct / 100.0 / 12.0;
  RETURN ROUND(principal * r * POWER(1 + r, n) / (POWER(1 + r, n) - 1), 2);
END;
$$;
-- 0003: Trigger to maintain transaction.outcode from property → location
-- Enforces the controlled denormalisation: transaction.outcode always matches
-- the outcode derived from property.location_id → location.outcode.

CREATE OR REPLACE FUNCTION maintain_transaction_outcode()
RETURNS TRIGGER AS $$
BEGIN
  SELECT l.outcode INTO NEW.outcode
  FROM "property" p
  JOIN "location" l ON l.location_id = p.location_id
  WHERE p.property_id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_transaction_outcode
  BEFORE INSERT OR UPDATE ON "transaction"
  FOR EACH ROW
  EXECUTE FUNCTION maintain_transaction_outcode();
-- 0004: Materialised view — mv_postcode_investment_metrics
-- Precomputed per-outcode investment metrics for Q4 (quadrant classification)
-- and the compare snapshot. Refreshed on demand after data ingestion.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_postcode_investment_metrics AS
WITH sale_stats AS (
  SELECT
    t.outcode,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.sale_price::numeric) AS median_sale_price_12m,
    STDDEV(t.sale_price::numeric) / NULLIF(AVG(t.sale_price::numeric), 0) AS price_volatility_score
  FROM "transaction" t
  WHERE t.sale_date >= CURRENT_DATE - INTERVAL '12 months'
    AND t.outcode IS NOT NULL
  GROUP BY t.outcode
),
yield_est AS (
  SELECT
    s.outcode,
    s.median_sale_price_12m,
    CASE WHEN s.median_sale_price_12m > 0
      THEN (ri.index_value * 12.0) / s.median_sale_price_12m * 100.0
      ELSE NULL
    END AS avg_yield_pct
  FROM sale_stats s
  LEFT JOIN LATERAL (
    SELECT index_value
    FROM "rental_index"
    WHERE region = 'London'
    ORDER BY reference_month DESC
    LIMIT 1
  ) ri ON true
),
growth AS (
  SELECT
    h1.outcode,
    ((h1.average_price - h2.average_price) / NULLIF(h2.average_price, 0)) * 100.0 AS yoy_price_growth_pct,
    ((h1.average_price - h3.average_price) / NULLIF(h3.average_price, 0)) * 100.0 AS three_year_price_growth_pct
  FROM (
    SELECT outcode, average_price
    FROM "hpi_index"
    WHERE reference_month = (SELECT MAX(reference_month) FROM "hpi_index")
  ) h1
  LEFT JOIN (
    SELECT outcode, average_price
    FROM "hpi_index"
    WHERE reference_month = (SELECT MAX(reference_month) FROM "hpi_index") - INTERVAL '12 months'
  ) h2 ON h1.outcode = h2.outcode
  LEFT JOIN (
    SELECT outcode, average_price
    FROM "hpi_index"
    WHERE reference_month = (SELECT MAX(reference_month) FROM "hpi_index") - INTERVAL '36 months'
  ) h3 ON h1.outcode = h3.outcode
),
crime_agg AS (
  SELECT
    l.outcode,
    SUM(cs.count)::numeric / NULLIF(COUNT(DISTINCT cs.reference_month), 0) AS crime_rate_index
  FROM "crime_stat" cs
  JOIN "location" l ON l.lsoa_code = cs.lsoa_code
  WHERE cs.reference_month >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY l.outcode
),
combined AS (
  SELECT
    y.outcode,
    y.median_sale_price_12m,
    COALESCE(y.avg_yield_pct, 0) AS avg_yield_pct,
    COALESCE(g.yoy_price_growth_pct, 0) AS yoy_price_growth_pct,
    COALESCE(g.three_year_price_growth_pct, 0) AS three_year_price_growth_pct,
    COALESCE(ss.price_volatility_score, 0) AS price_volatility_score,
    COALESCE(ca.crime_rate_index, 0) AS crime_rate_index
  FROM yield_est y
  LEFT JOIN growth g ON y.outcode = g.outcode
  LEFT JOIN sale_stats ss ON y.outcode = ss.outcode
  LEFT JOIN crime_agg ca ON y.outcode = ca.outcode
)
SELECT
  c.outcode,
  c.median_sale_price_12m,
  c.avg_yield_pct,
  c.yoy_price_growth_pct,
  c.three_year_price_growth_pct,
  c.price_volatility_score,
  c.crime_rate_index,
  NTILE(4) OVER (ORDER BY c.avg_yield_pct) AS yield_quartile,
  NTILE(4) OVER (ORDER BY c.yoy_price_growth_pct) AS growth_quartile,
  CASE
    WHEN NTILE(4) OVER (ORDER BY c.avg_yield_pct) >= 3
     AND NTILE(4) OVER (ORDER BY c.yoy_price_growth_pct) >= 3 THEN 'UNICORN'
    WHEN NTILE(4) OVER (ORDER BY c.avg_yield_pct) >= 3 THEN 'CASH_COW'
    WHEN NTILE(4) OVER (ORDER BY c.yoy_price_growth_pct) >= 3 THEN 'GROWTH_PLAY'
    ELSE 'AVOID'
  END AS quadrant
FROM combined c;

CREATE UNIQUE INDEX ON mv_postcode_investment_metrics (outcode);

-- Refresh function — call after data ingestion
CREATE OR REPLACE FUNCTION refresh_postcode_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_postcode_investment_metrics;
END;
$$;
-- 0005: Least-privilege read-only role for the application
-- The app should connect via app_readonly for all SELECT queries.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT EXECUTE ON FUNCTION calculate_monthly_payment(numeric, numeric, integer, text) TO app_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;
