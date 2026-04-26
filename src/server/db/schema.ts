import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  numeric,
  timestamp,
  date,
  integer,
  smallint,
  bigint,
  uuid,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const propertyTypeEnum = pgEnum("property_type_enum", [
  "DETACHED",
  "SEMI_DETACHED",
  "TERRACED",
  "FLAT",
  "OTHER",
]);

export const tenureEnum = pgEnum("tenure_enum", [
  "FREEHOLD",
  "LEASEHOLD",
  "SHARED_OWNERSHIP",
]);

export const transactionCategoryEnum = pgEnum("transaction_category_enum", [
  "STANDARD_SALE",
  "NEW_BUILD",
  "OTHER",
]);

export const mortgageTypeEnum = pgEnum("mortgage_type_enum", [
  "INTEREST_ONLY",
  "REPAYMENT",
]);

export const verdictEnum = pgEnum("verdict_enum", [
  "CASH_COW",
  "GROWTH_PLAY",
  "UNICORN",
  "AVOID",
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

/** Postcode hierarchy — maps every London postcode to its outcode, borough, region, and LSOA. */
export const location = pgTable(
  "location",
  {
    locationId: serial("location_id").primaryKey(),
    postcode: varchar("postcode", { length: 10 }).unique().notNull(),
    outcode: varchar("outcode", { length: 6 }).notNull(),
    borough: varchar("borough", { length: 100 }),
    region: varchar("region", { length: 100 }),
    lsoaCode: varchar("lsoa_code", { length: 20 }),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_location_outcode").on(t.outcode),
    index("idx_location_postcode").on(t.postcode),
  ],
);

/** Physical property — one row per unique address/UPRN. */
export const property = pgTable(
  "property",
  {
    propertyId: serial("property_id").primaryKey(),
    uprn: bigint("uprn", { mode: "number" }).unique(),
    locationId: integer("location_id")
      .references(() => location.locationId)
      .notNull(),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    propertyType: propertyTypeEnum("property_type"),
    tenure: tenureEnum("tenure"),
    bedrooms: smallint("bedrooms"),
    floorAreaSqm: numeric("floor_area_sqm", { precision: 8, scale: 2 }),
    epcRating: varchar("epc_rating", { length: 5 }),
    epcScore: smallint("epc_score"),
    constructionAgeBand: varchar("construction_age_band", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  () => [
    check(
      "chk_bedrooms",
      sql`bedrooms IS NULL OR (bedrooms BETWEEN 0 AND 20)`,
    ),
  ],
);

/**
 * HM Land Registry sales.
 *
 * `outcode` is a **controlled denormalisation** — it duplicates location.outcode
 * via property → location to avoid a 3-table join on every window-function pass
 * in Q2 (historical drill-down). Integrity is maintained by the
 * `maintain_transaction_outcode` trigger (see drizzle/0003_outcode_trigger.sql).
 */
export const transaction = pgTable(
  "transaction",
  {
    transactionId: serial("transaction_id").primaryKey(),
    propertyId: integer("property_id")
      .references(() => property.propertyId)
      .notNull(),
    outcode: varchar("outcode", { length: 6 }),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull(),
    saleDate: date("sale_date").notNull(),
    transactionCategory: transactionCategoryEnum("transaction_category"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_transaction_outcode_date").on(
      t.outcode,
      sql`${t.saleDate} DESC`,
    ),
    check("chk_sale_price", sql`sale_price > 0 AND sale_price < 100000000`),
    check("chk_sale_date", sql`sale_date <= CURRENT_DATE`),
  ],
);

/** ONS Private Rental Prices Index — monthly rental index by region. */
export const rentalIndex = pgTable(
  "rental_index",
  {
    rentalIndexId: serial("rental_index_id").primaryKey(),
    region: varchar("region", { length: 100 }).notNull(),
    referenceMonth: date("reference_month").notNull(),
    indexValue: numeric("index_value", { precision: 8, scale: 2 }),
    monthlyPctChange: numeric("monthly_pct_change", {
      precision: 5,
      scale: 2,
    }),
    annualPctChange: numeric("annual_pct_change", { precision: 5, scale: 2 }),
  },
  (t) => [
    uniqueIndex("uq_rental_index_region_month").on(
      t.region,
      t.referenceMonth,
    ),
  ],
);

/** ONS House Price Index — monthly average price and index by outcode. */
export const hpiIndex = pgTable(
  "hpi_index",
  {
    hpiIndexId: serial("hpi_index_id").primaryKey(),
    outcode: varchar("outcode", { length: 6 }).notNull(),
    referenceMonth: date("reference_month").notNull(),
    averagePrice: numeric("average_price", { precision: 12, scale: 2 }),
    indexValue: numeric("index_value", { precision: 8, scale: 2 }),
    annualPctChange: numeric("annual_pct_change", { precision: 5, scale: 2 }),
  },
  (t) => [
    uniqueIndex("uq_hpi_outcode_month").on(t.outcode, t.referenceMonth),
    index("idx_hpi_outcode_date").on(t.outcode, sql`${t.referenceMonth} DESC`),
  ],
);

/** data.police.uk crime statistics aggregated by LSOA and month. */
export const crimeStat = pgTable(
  "crime_stat",
  {
    crimeStatId: serial("crime_stat_id").primaryKey(),
    lsoaCode: varchar("lsoa_code", { length: 20 }).notNull(),
    referenceMonth: date("reference_month").notNull(),
    category: varchar("category", { length: 60 }).notNull(),
    count: integer("count").notNull(),
  },
  (t) => [
    index("idx_crime_stat_lsoa").on(t.lsoaCode),
    uniqueIndex("uq_crime_lsoa_month_cat").on(
      t.lsoaCode,
      t.referenceMonth,
      t.category,
    ),
    check("chk_crime_count", sql`count >= 0`),
  ],
);

/** Manually curated BTL mortgage products from major lenders. */
export const mortgageProduct = pgTable("mortgage_product", {
  mortgageProductId: serial("mortgage_product_id").primaryKey(),
  lender: varchar("lender", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  mortgageType: mortgageTypeEnum("mortgage_type").notNull(),
  maxLtvPct: numeric("max_ltv_pct", { precision: 5, scale: 2 }),
  initialRatePct: numeric("initial_rate_pct", { precision: 5, scale: 3 }),
  initialPeriodMonths: smallint("initial_period_months"),
  followOnRatePct: numeric("follow_on_rate_pct", { precision: 5, scale: 3 }),
  productFeeGbp: numeric("product_fee_gbp", { precision: 8, scale: 2 }),
  capturedAt: date("captured_at"),
  sourceUrl: varchar("source_url", { length: 500 }),
});

/** Persisted user what-if scenarios with composite score and verdict. */
export const investorScenario = pgTable("investor_scenario", {
  scenarioId: uuid("scenario_id").defaultRandom().primaryKey(),
  shareableSlug: varchar("shareable_slug", { length: 100 }).unique(),
  targetPostcode: varchar("target_postcode", { length: 10 }),
  askingPrice: numeric("asking_price", { precision: 12, scale: 2 }),
  expectedMonthlyRent: numeric("expected_monthly_rent", {
    precision: 10,
    scale: 2,
  }),
  depositPct: numeric("deposit_pct", { precision: 5, scale: 2 }),
  mortgageProductId: integer("mortgage_product_id").references(
    () => mortgageProduct.mortgageProductId,
  ),
  compositeScore: numeric("composite_score", { precision: 5, scale: 2 }),
  verdict: verdictEnum("verdict"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
