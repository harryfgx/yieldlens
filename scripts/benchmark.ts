import "dotenv/config";
import postgres from "postgres";
import { writeFileSync } from "fs";

const sql = postgres(process.env.DIRECT_URL!);

interface QueryDef {
  name: string;
  query: string;
  params: (string | number | string[])[];
}

const queries: QueryDef[] = [
  {
    name: "Q1 Comparables",
    query: `WITH comparables AS (
      SELECT t.sale_price, p.floor_area_sqm,
        CASE WHEN p.floor_area_sqm > 0 THEN t.sale_price / (p.floor_area_sqm * 10.764) ELSE NULL END AS gbp_per_sqft
      FROM transaction t JOIN property p ON p.property_id = t.property_id JOIN location l ON l.location_id = p.location_id
      WHERE t.outcode = $1 AND p.bedrooms = $2 AND p.property_type = $3
        AND (p.floor_area_sqm IS NULL OR p.floor_area_sqm BETWEEN $4 AND $5)
        AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
    ) SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_price) AS median, COUNT(*)::int AS cnt FROM comparables`,
    params: ["SE16", 2, "FLAT", 56, 84],
  },
  {
    name: "Q2 Historical Drilldown",
    query: `WITH monthly_prices AS (
      SELECT t.outcode, DATE_TRUNC('month', t.sale_date::timestamp)::date AS month, AVG(t.sale_price::numeric) AS avg_price
      FROM transaction t WHERE t.outcode IS NOT NULL AND t.sale_date >= CURRENT_DATE - INTERVAL '5 years'
      GROUP BY t.outcode, DATE_TRUNC('month', t.sale_date::timestamp)
    ),
    outcode_level AS (
      SELECT 'outcode' AS geo_level, $1 AS geo_value, month, avg_price,
        AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg
      FROM monthly_prices WHERE outcode = $1
    ) SELECT * FROM outcode_level ORDER BY month`,
    params: ["SE16"],
  },
  {
    name: "Q3 Composite Score",
    query: `WITH mortgage_calc AS (
      SELECT mp.mortgage_product_id, calculate_monthly_payment(300000::numeric, mp.initial_rate_pct, 25, mp.mortgage_type::text) AS monthly_payment
      FROM mortgage_product mp WHERE mp.mortgage_product_id = $1
    ),
    yield_calc AS (SELECT (1800 * 12.0 / 400000 * 100) AS gross_yield_pct),
    growth_cte AS (SELECT COALESCE(AVG(annual_pct_change::numeric), 0) AS g FROM hpi_index WHERE outcode = $2 AND reference_month >= CURRENT_DATE - INTERVAL '3 years'),
    risk_cte AS (SELECT COALESCE(AVG(cs.count), 0) AS r FROM crime_stat cs JOIN location l ON l.lsoa_code = cs.lsoa_code WHERE l.outcode = $2 AND cs.reference_month >= CURRENT_DATE - INTERVAL '12 months'),
    all_outcodes AS (SELECT outcode, avg_yield_pct::numeric AS yv, yoy_price_growth_pct::numeric AS gv FROM mv_postcode_investment_metrics),
    quartiles AS (SELECT outcode, NTILE(4) OVER (ORDER BY yv) AS yq, NTILE(4) OVER (ORDER BY gv) AS gq FROM all_outcodes),
    tq AS (SELECT yq, gq FROM quartiles WHERE outcode = $2)
    SELECT tq.yq, tq.gq, yc.gross_yield_pct, gc.g, rc.r, mc.monthly_payment FROM tq CROSS JOIN yield_calc yc CROSS JOIN growth_cte gc CROSS JOIN risk_cte rc CROSS JOIN mortgage_calc mc`,
    params: [1, "SE16"],
  },
  {
    name: "Q4 Quadrant",
    query: `SELECT outcode, avg_yield_pct, yoy_price_growth_pct, quadrant FROM mv_postcode_investment_metrics ORDER BY outcode`,
    params: [],
  },
];

async function main() {
  const iterations = 100;
  const results: { name: string; p50: number; p95: number; p99: number }[] = [];

  // Warm up
  console.log("Warming up...");
  for (const q of queries) {
    await sql.unsafe(q.query, q.params as (string | number)[]);
  }

  for (const q of queries) {
    const times: number[] = [];
    process.stdout.write(`Benchmarking ${q.name}...`);
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await sql.unsafe(q.query, q.params as (string | number)[]);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(iterations * 0.5)]!;
    const p95 = times[Math.floor(iterations * 0.95)]!;
    const p99 = times[Math.floor(iterations * 0.99)]!;
    results.push({ name: q.name, p50: Math.round(p50), p95: Math.round(p95), p99: Math.round(p99) });
    console.log(` p50=${Math.round(p50)}ms p95=${Math.round(p95)}ms p99=${Math.round(p99)}ms`);
  }

  const md = [
    "# Performance Benchmarks",
    "",
    `Run: ${new Date().toISOString()} | Iterations: ${iterations} | Connection: DIRECT_URL (Supabase Postgres)`,
    "",
    "| Query | p50 (ms) | p95 (ms) | p99 (ms) |",
    "|-------|----------|----------|----------|",
    ...results.map((r) => `| ${r.name} | ${r.p50} | ${r.p95} | ${r.p99} |`),
    "",
  ].join("\n");

  writeFileSync("evidence/06-dashboard/performance-benchmarks.md", md);
  console.log("\nResults written to evidence/06-dashboard/performance-benchmarks.md");

  const failed = results.filter((r) => r.p50 >= 200);
  if (failed.length > 0) {
    console.error(`\nFAILED: ${failed.map((f) => `${f.name} p50=${f.p50}ms`).join(", ")} exceed 200ms threshold`);
    await sql.end();
    process.exit(1);
  }

  console.log("\nALL QUERIES PASS p50 < 200ms ✓");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
