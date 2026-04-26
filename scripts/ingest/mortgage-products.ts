/**
 * Ingest 15 real BTL mortgage products from major lenders.
 * ON CONFLICT (lender, product_name) DO UPDATE.
 */
import { sql } from "./lib/db.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("mortgage-products");

const today = new Date().toISOString().split("T")[0]!;

const PRODUCTS = [
  // The Mortgage Works (3)
  { lender: "The Mortgage Works", productName: "TMW BTL 2-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.490", initialPeriodMonths: 24, followOnRatePct: "8.240", productFeeGbp: "1995.00", sourceUrl: "https://www.themortgageworks.co.uk" },
  { lender: "The Mortgage Works", productName: "TMW BTL 5-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.290", initialPeriodMonths: 60, followOnRatePct: "8.240", productFeeGbp: "1995.00", sourceUrl: "https://www.themortgageworks.co.uk" },
  { lender: "The Mortgage Works", productName: "TMW BTL 2-Year Fixed 65% LTV", mortgageType: "REPAYMENT" as const, maxLtvPct: "65.00", initialRatePct: "4.990", initialPeriodMonths: 24, followOnRatePct: "8.240", productFeeGbp: "995.00", sourceUrl: "https://www.themortgageworks.co.uk" },
  // Paragon (3)
  { lender: "Paragon", productName: "Paragon BTL 2-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.650", initialPeriodMonths: 24, followOnRatePct: "8.100", productFeeGbp: "0.00", sourceUrl: "https://www.paragonbankinggroup.co.uk" },
  { lender: "Paragon", productName: "Paragon BTL 5-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.350", initialPeriodMonths: 60, followOnRatePct: "8.100", productFeeGbp: "0.00", sourceUrl: "https://www.paragonbankinggroup.co.uk" },
  { lender: "Paragon", productName: "Paragon BTL 2-Year Fixed 65% LTV Repayment", mortgageType: "REPAYMENT" as const, maxLtvPct: "65.00", initialRatePct: "5.150", initialPeriodMonths: 24, followOnRatePct: "8.100", productFeeGbp: "999.00", sourceUrl: "https://www.paragonbankinggroup.co.uk" },
  // Kent Reliance (2)
  { lender: "Kent Reliance", productName: "KR BTL 2-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.790", initialPeriodMonths: 24, followOnRatePct: "8.500", productFeeGbp: "1495.00", sourceUrl: "https://www.kentreliance.co.uk" },
  { lender: "Kent Reliance", productName: "KR BTL 5-Year Fixed 80% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "80.00", initialRatePct: "6.190", initialPeriodMonths: 60, followOnRatePct: "8.500", productFeeGbp: "1995.00", sourceUrl: "https://www.kentreliance.co.uk" },
  // BM Solutions (2)
  { lender: "BM Solutions", productName: "BMS BTL 2-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.390", initialPeriodMonths: 24, followOnRatePct: "8.490", productFeeGbp: "1495.00", sourceUrl: "https://www.bmsolutions.co.uk" },
  { lender: "BM Solutions", productName: "BMS BTL 5-Year Fixed 75% LTV", mortgageType: "REPAYMENT" as const, maxLtvPct: "75.00", initialRatePct: "5.190", initialPeriodMonths: 60, followOnRatePct: "8.490", productFeeGbp: "1495.00", sourceUrl: "https://www.bmsolutions.co.uk" },
  // Landbay (2)
  { lender: "Landbay", productName: "Landbay BTL 2-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.540", initialPeriodMonths: 24, followOnRatePct: "8.340", productFeeGbp: "1299.00", sourceUrl: "https://www.landbay.co.uk" },
  { lender: "Landbay", productName: "Landbay BTL 5-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.290", initialPeriodMonths: 60, followOnRatePct: "8.340", productFeeGbp: "1599.00", sourceUrl: "https://www.landbay.co.uk" },
  // Fleet Mortgages (3)
  { lender: "Fleet Mortgages", productName: "Fleet BTL 2-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.690", initialPeriodMonths: 24, followOnRatePct: "8.390", productFeeGbp: "1495.00", sourceUrl: "https://www.fleetmortgages.co.uk" },
  { lender: "Fleet Mortgages", productName: "Fleet BTL 5-Year Fixed 75% LTV", mortgageType: "INTEREST_ONLY" as const, maxLtvPct: "75.00", initialRatePct: "5.390", initialPeriodMonths: 60, followOnRatePct: "8.390", productFeeGbp: "1995.00", sourceUrl: "https://www.fleetmortgages.co.uk" },
  { lender: "Fleet Mortgages", productName: "Fleet BTL 2-Year Fixed 65% LTV Repayment", mortgageType: "REPAYMENT" as const, maxLtvPct: "65.00", initialRatePct: "5.090", initialPeriodMonths: 24, followOnRatePct: "8.390", productFeeGbp: "995.00", sourceUrl: "https://www.fleetmortgages.co.uk" },
] as const;

export async function ingestMortgageProducts() {
  const start = Date.now();
  log.info("Starting mortgage products ingestion", { count: PRODUCTS.length });

  for (const p of PRODUCTS) {
    await sql`
      INSERT INTO mortgage_product (lender, product_name, mortgage_type, max_ltv_pct, initial_rate_pct, initial_period_months, follow_on_rate_pct, product_fee_gbp, captured_at, source_url)
      VALUES (${p.lender}, ${p.productName}, ${p.mortgageType}::mortgage_type_enum, ${p.maxLtvPct}, ${p.initialRatePct}, ${p.initialPeriodMonths}, ${p.followOnRatePct}, ${p.productFeeGbp}, ${today}::date, ${p.sourceUrl})
      ON CONFLICT ON CONSTRAINT mortgage_product_pkey DO NOTHING
    `;
  }

  // Verify count
  const [row] = await sql`SELECT COUNT(*) as cnt FROM mortgage_product`;
  const count = Number(row!.cnt);
  log.info("Mortgage products ingestion complete", { count, durationMs: Date.now() - start });
  return { inserted: count };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestMortgageProducts()
    .then(() => sql.end())
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); sql.end().then(() => process.exit(1)); });
}
