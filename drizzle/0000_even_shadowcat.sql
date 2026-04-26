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
CREATE INDEX "idx_transaction_outcode_date" ON "transaction" USING btree ("outcode","sale_date" DESC);