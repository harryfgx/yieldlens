import "dotenv/config";
import postgres from "postgres";
import { writeFileSync } from "fs";

const sql = postgres(process.env.DIRECT_URL!);

const queries: { name: string; file: string; query: string; params: (string | number)[] }[] = [
  {
    name: "Q1 Comparables",
    file: "evidence/05-sql-queries/q1-comparables-explain.txt",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      WITH comparables AS (
        SELECT t.sale_price, p.floor_area_sqm,
          CASE WHEN p.floor_area_sqm > 0 THEN t.sale_price / (p.floor_area_sqm * 10.764) ELSE NULL END AS gbp_per_sqft
        FROM transaction t
        JOIN property p ON p.property_id = t.property_id
        JOIN location l ON l.location_id = p.location_id
        WHERE t.outcode = $1 AND p.bedrooms = $2 AND p.property_type = $3
          AND (p.floor_area_sqm IS NULL OR p.floor_area_sqm BETWEEN $4 AND $5)
          AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
      )
      SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sale_price) AS p25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_price) AS median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sale_price) AS p75,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gbp_per_sqft) AS median_gbp_per_sqft,
        COUNT(*)::int AS comparable_count
      FROM comparables`,
    params: ["SE16", 2, "FLAT", 56, 84],
  },
  {
    name: "Q2 Historical Drilldown",
    file: "evidence/05-sql-queries/q2-historical-drilldown-explain.txt",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      WITH monthly_prices AS (
        SELECT t.outcode, DATE_TRUNC('month', t.sale_date::timestamp)::date AS month, AVG(t.sale_price::numeric) AS avg_price
        FROM transaction t WHERE t.outcode IS NOT NULL AND t.sale_date >= CURRENT_DATE - INTERVAL '5 years'
        GROUP BY t.outcode, DATE_TRUNC('month', t.sale_date::timestamp)
      ),
      outcode_level AS (
        SELECT 'outcode' AS geo_level, $1 AS geo_value, month, avg_price,
          AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
          CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
            THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
            ELSE NULL END AS yoy_growth_pct
        FROM monthly_prices WHERE outcode = $1
      )
      SELECT * FROM outcode_level ORDER BY month`,
    params: ["SE16"],
  },
  {
    name: "Q3 Composite Score",
    file: "evidence/05-sql-queries/q3-composite-score-explain.txt",
    query: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      WITH mortgage_calc AS (
        SELECT mp.mortgage_product_id, mp.mortgage_type, mp.initial_rate_pct,
          calculate_monthly_payment(300000::numeric, mp.initial_rate_pct, 25, mp.mortgage_type::text) AS monthly_payment
        FROM mortgage_product mp WHERE mp.mortgage_product_id = $1
      ),
      yield_calc AS (SELECT (1800 * 12.0 / 400000 * 100) AS gross_yield_pct, ((1800 - 1800 * 0.25) * 12.0 / 400000 * 100) AS net_yield_pct),
      growth_cte AS (SELECT COALESCE(AVG(annual_pct_change::numeric), 0) AS avg_annual_growth FROM hpi_index WHERE outcode = $2 AND reference_month >= CURRENT_DATE - INTERVAL '3 years'),
      risk_cte AS (SELECT COALESCE(AVG(cs.count), 0) AS avg_crime_rate FROM crime_stat cs JOIN location l ON l.lsoa_code = cs.lsoa_code WHERE l.outcode = $2 AND cs.reference_month >= CURRENT_DATE - INTERVAL '12 months'),
      all_outcodes AS (SELECT outcode, avg_yield_pct::numeric AS yield_val, yoy_price_growth_pct::numeric AS growth_val FROM mv_postcode_investment_metrics),
      quartiles AS (SELECT outcode, NTILE(4) OVER (ORDER BY yield_val) AS yield_quartile, NTILE(4) OVER (ORDER BY growth_val) AS growth_quartile FROM all_outcodes),
      target_quartiles AS (SELECT yield_quartile, growth_quartile FROM quartiles WHERE outcode = $2)
      SELECT tq.yield_quartile, tq.growth_quartile, yc.gross_yield_pct, yc.net_yield_pct, gc.avg_annual_growth, rc.avg_crime_rate, mc.monthly_payment
      FROM target_quartiles tq CROSS JOIN yield_calc yc CROSS JOIN growth_cte gc CROSS JOIN risk_cte rc CROSS JOIN mortgage_calc mc`,
    params: [1, "SE16"],
  },
  {
    name: "Q4 Quadrant",
    file: "evidence/05-sql-queries/q4-quadrant-explain.txt",
    query: `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
      SELECT outcode, avg_yield_pct, yoy_price_growth_pct, yield_quartile, growth_quartile, quadrant
      FROM mv_postcode_investment_metrics ORDER BY outcode`,
    params: [],
  },
];

async function main() {
  for (const q of queries) {
    console.log(`Running EXPLAIN for ${q.name}...`);
    const result = await sql.unsafe(q.query, q.params);
    const plan = result.map((r: Record<string, unknown>) => r["QUERY PLAN"]).join("\n");
    writeFileSync(q.file, `-- ${q.name}\n-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)\n\n${plan}\n`);
    console.log(`  Saved to ${q.file} (${plan.length} bytes)`);
  }
  await sql.end();
  console.log("\nAll EXPLAIN plans captured.");
}

main().catch((e) => { console.error(e); process.exit(1); });
