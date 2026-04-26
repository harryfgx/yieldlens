/**
 * Verify data quality against 11 threshold checks per DAMA dimensions.
 * Writes results to evidence/04-data-quality/quality-check-results.json.
 * Exits 0 iff all 11 pass.
 */
import postgres from "postgres";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import "dotenv/config";

const url = process.env.DIRECT_URL;
if (!url) { console.error("Missing DIRECT_URL"); process.exit(1); }
const sql = postgres(url);

interface Check {
  dimension: string;
  metric: string;
  query: string;
  threshold: number;
  operator: "gte" | "eq" | "lte";
}

const CHECKS: Check[] = [
  { dimension: "Completeness", metric: "location_count", query: "SELECT COUNT(*) as v FROM location", threshold: 100000, operator: "gte" },
  { dimension: "Completeness", metric: "property_count", query: "SELECT COUNT(*) as v FROM property", threshold: 100000, operator: "gte" },
  { dimension: "Completeness", metric: "transaction_count", query: "SELECT COUNT(*) as v FROM transaction", threshold: 490000, operator: "gte" },
  { dimension: "Completeness", metric: "rental_index_count", query: "SELECT COUNT(*) as v FROM rental_index", threshold: 500, operator: "gte" },
  { dimension: "Completeness", metric: "hpi_index_count", query: "SELECT COUNT(*) as v FROM hpi_index", threshold: 500, operator: "gte" },
  { dimension: "Completeness", metric: "crime_stat_count", query: "SELECT COUNT(*) as v FROM crime_stat", threshold: 10000, operator: "gte" },
  { dimension: "Completeness", metric: "mortgage_product_count", query: "SELECT COUNT(*) as v FROM mortgage_product", threshold: 15, operator: "eq" },
  { dimension: "Validity", metric: "invalid_sale_prices", query: "SELECT COUNT(*) as v FROM transaction WHERE sale_price <= 0 OR sale_price >= 100000000", threshold: 0, operator: "eq" },
  { dimension: "Timeliness", metric: "future_sale_dates", query: "SELECT COUNT(*) as v FROM transaction WHERE sale_date > CURRENT_DATE", threshold: 0, operator: "eq" },
  { dimension: "Validity", metric: "invalid_bedrooms", query: "SELECT COUNT(*) as v FROM property WHERE bedrooms < 0 OR bedrooms > 20", threshold: 0, operator: "eq" },
  { dimension: "Validity", metric: "negative_crime_counts", query: "SELECT COUNT(*) as v FROM crime_stat WHERE count < 0", threshold: 0, operator: "eq" },
];

async function main() {
  const results: Array<{ dimension: string; metric: string; value: number; threshold: number; pass: boolean }> = [];
  let allPass = true;

  console.log("\n  Data Quality Verification\n  ─────────────────────────\n");

  for (const check of CHECKS) {
    const [row] = await sql.unsafe(check.query);
    const value = Number(row!.v);
    let pass: boolean;

    switch (check.operator) {
      case "gte": pass = value >= check.threshold; break;
      case "eq": pass = value === check.threshold; break;
      case "lte": pass = value <= check.threshold; break;
    }

    results.push({ dimension: check.dimension, metric: check.metric, value, threshold: check.threshold, pass });

    const icon = pass ? "✓" : "✗";
    const op = check.operator === "gte" ? "≥" : check.operator === "eq" ? "=" : "≤";
    console.log(`  ${icon} ${check.metric}: ${value} (${op} ${check.threshold})`);

    if (!pass) allPass = false;
  }

  // Write results
  const outDir = join(process.cwd(), "evidence/04-data-quality");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "quality-check-results.json"), JSON.stringify(results, null, 2));

  console.log(`\n  ${allPass ? "ALL CHECKS PASSED ✓" : "SOME CHECKS FAILED ✗"}\n`);

  await sql.end();
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
