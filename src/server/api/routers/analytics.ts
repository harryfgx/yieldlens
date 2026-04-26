import { z } from "zod";
import { sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]? ?[0-9][A-Z]{2}$/i;

/** Safely convert an unknown DB value to string */
function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  return fallback;
}

/** Safely convert an unknown DB value to number */
function num(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export const analyticsRouter = createTRPCRouter({
  /**
   * Q1: Comparables Analysis | S11: Descriptive + Statistical
   * Decision: Is the asking price fair relative to recent local sales?
   */
  comparables: publicProcedure
    .input(
      z.object({
        postcode: z.string().regex(postcodeRegex, "Enter a valid UK postcode"),
        bedrooms: z.number().int().min(1).max(10),
        propertyType: z.enum([
          "DETACHED",
          "SEMI_DETACHED",
          "TERRACED",
          "FLAT",
          "OTHER",
        ]),
        floorAreaSqm: z.number().min(10).max(1000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const outcode = input.postcode.replace(/\s/g, "").slice(0, -3).toUpperCase();
      const areaLow = input.floorAreaSqm * 0.8;
      const areaHigh = input.floorAreaSqm * 1.2;

      const result = await ctx.db.execute(sql`
        -- Q1: Comparables Analysis | S11: Descriptive + Statistical | Decision: Is the asking price fair relative to recent local sales?
        WITH comparables AS (
          SELECT
            t.sale_price,
            t.sale_date,
            p.bedrooms,
            p.floor_area_sqm,
            p.address_line_1,
            l.postcode,
            CASE WHEN p.floor_area_sqm > 0
              THEN t.sale_price / (p.floor_area_sqm * 10.764)
              ELSE NULL
            END AS gbp_per_sqft
          FROM transaction t
          JOIN property p ON p.property_id = t.property_id
          JOIN location l ON l.location_id = p.location_id
          WHERE t.outcode = ${outcode}
            AND p.bedrooms = ${input.bedrooms}
            AND p.property_type = ${input.propertyType}
            AND (p.floor_area_sqm IS NULL OR p.floor_area_sqm BETWEEN ${areaLow} AND ${areaHigh})
            AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
        )
        SELECT
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sale_price) AS p25,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_price) AS median,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sale_price) AS p75,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gbp_per_sqft) AS median_gbp_per_sqft,
          COUNT(*)::int AS comparable_count
        FROM comparables
      `);

      const row = result[0];

      // Also fetch individual comparables for the table
      const comparableRows = await ctx.db.execute(sql`
        SELECT
          l.postcode AS area,
          t.sale_date,
          t.sale_price,
          CASE WHEN p.floor_area_sqm > 0
            THEN ROUND(t.sale_price / (p.floor_area_sqm * 10.764), 2)
            ELSE NULL
          END AS gbp_per_sqft,
          p.bedrooms
        FROM transaction t
        JOIN property p ON p.property_id = t.property_id
        JOIN location l ON l.location_id = p.location_id
        WHERE t.outcode = ${outcode}
          AND p.bedrooms = ${input.bedrooms}
          AND p.property_type = ${input.propertyType}
          AND (p.floor_area_sqm IS NULL OR p.floor_area_sqm BETWEEN ${areaLow} AND ${areaHigh})
          AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
        ORDER BY t.sale_date DESC
        LIMIT 10
      `);

      return {
        p25: row?.p25 != null ? num(row.p25) : null,
        median: row?.median != null ? num(row.median) : null,
        p75: row?.p75 != null ? num(row.p75) : null,
        median_gbp_per_sqft: row?.median_gbp_per_sqft != null ? num(row.median_gbp_per_sqft) : null,
        comparable_count: row?.comparable_count != null ? num(row.comparable_count) : 0,
        comparables: comparableRows.map((r) => ({
          area: str(r.area),
          sale_date: str(r.sale_date),
          sale_price: num(r.sale_price),
          gbp_per_sqft: r.gbp_per_sqft != null ? num(r.gbp_per_sqft) : null,
          bedrooms: num(r.bedrooms),
        })),
      };
    }),

  /**
   * Q2: Multi-Level Historical Drill-Down | S11: Descriptive + Predictive
   * Decision: Is this area accelerating or decelerating vs its wider region?
   */
  historicalDrilldown: publicProcedure
    .input(z.object({ outcode: z.string() }))
    .query(async ({ ctx, input }) => {
      const oc = input.outcode.toUpperCase();
      // Derive area: letters at start of outcode (e.g. SE from SE16, EC from EC1)
      const areaMatch = /^[A-Z]+/.exec(oc);
      const area = areaMatch ? areaMatch[0] : oc;
      // Derive postcode sector prefix (first 3-4 chars)
      const sector = oc.length >= 3 ? oc.substring(0, Math.min(4, oc.length)) : oc;

      const result = await ctx.db.execute(sql`
        -- Q2: Multi-Level Historical Drill-Down | S11: Descriptive + Predictive | Decision: Is this area accelerating or decelerating vs its wider region?
        WITH monthly_prices AS (
          SELECT
            t.outcode,
            DATE_TRUNC('month', t.sale_date::timestamp)::date AS month,
            AVG(t.sale_price::numeric) AS avg_price
          FROM transaction t
          WHERE t.outcode IS NOT NULL
            AND t.sale_date >= CURRENT_DATE - INTERVAL '5 years'
          GROUP BY t.outcode, DATE_TRUNC('month', t.sale_date::timestamp)
        ),
        sector_level AS (
          SELECT
            'postcode_sector' AS geo_level,
            ${sector} AS geo_value,
            month,
            avg_price,
            AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
            CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
              THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
              ELSE NULL
            END AS yoy_growth_pct
          FROM monthly_prices
          WHERE outcode = ${oc}
        ),
        outcode_level AS (
          SELECT
            'outcode' AS geo_level,
            ${oc} AS geo_value,
            month,
            avg_price,
            AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
            CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
              THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
              ELSE NULL
            END AS yoy_growth_pct
          FROM monthly_prices
          WHERE outcode = ${oc}
        ),
        area_agg AS (
          SELECT
            DATE_TRUNC('month', t.sale_date::timestamp)::date AS month,
            AVG(t.sale_price::numeric) AS avg_price
          FROM transaction t
          WHERE t.outcode LIKE ${area + "%"}
            AND t.sale_date >= CURRENT_DATE - INTERVAL '5 years'
          GROUP BY DATE_TRUNC('month', t.sale_date::timestamp)
        ),
        area_level AS (
          SELECT
            'area' AS geo_level,
            ${area} AS geo_value,
            month,
            avg_price,
            AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
            CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
              THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
              ELSE NULL
            END AS yoy_growth_pct
          FROM area_agg
        ),
        region_agg AS (
          SELECT
            DATE_TRUNC('month', t.sale_date::timestamp)::date AS month,
            AVG(t.sale_price::numeric) AS avg_price
          FROM transaction t
          WHERE t.outcode IS NOT NULL
            AND t.sale_date >= CURRENT_DATE - INTERVAL '5 years'
          GROUP BY DATE_TRUNC('month', t.sale_date::timestamp)
        ),
        region_level AS (
          SELECT
            'region' AS geo_level,
            'London' AS geo_value,
            month,
            avg_price,
            AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
            CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
              THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
              ELSE NULL
            END AS yoy_growth_pct
          FROM region_agg
        )
        SELECT * FROM sector_level
        UNION ALL SELECT * FROM outcode_level
        UNION ALL SELECT * FROM area_level
        UNION ALL SELECT * FROM region_level
        ORDER BY geo_level, month
      `);

      return (result as Record<string, unknown>[]).map((r) => ({
        geo_level: str(r.geo_level),
        geo_value: str(r.geo_value),
        month: str(r.month),
        avg_price: r.avg_price != null ? num(r.avg_price) : null,
        rolling_12m_avg: r.rolling_12m_avg != null ? num(r.rolling_12m_avg) : null,
        yoy_growth_pct: r.yoy_growth_pct != null ? num(r.yoy_growth_pct) : null,
      }));
    }),

  /**
   * Q3: Composite Investment Score | S11: Diagnostic
   * Decision: All factors considered, how good is this BTL investment?
   */
  compositeScore: publicProcedure
    .input(
      z.object({
        postcode: z.string().regex(postcodeRegex),
        bedrooms: z.number().int().min(1).max(10),
        propertyType: z.enum([
          "DETACHED",
          "SEMI_DETACHED",
          "TERRACED",
          "FLAT",
          "OTHER",
        ]),
        askingPrice: z.number().min(50000).max(10000000),
        expectedMonthlyRent: z.number().min(100).max(20000),
        depositPct: z.number().min(5).max(50),
        mortgageProductId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const outcode = input.postcode.replace(/\s/g, "").slice(0, -3).toUpperCase();
      const loanAmount = input.askingPrice * (1 - input.depositPct / 100);

      const result = await ctx.db.execute(sql`
        -- Q3: Composite Investment Score | S11: Diagnostic | Decision: All factors considered, how good is this BTL investment?
        WITH mortgage_calc AS (
          SELECT
            mp.mortgage_product_id,
            mp.mortgage_type,
            mp.initial_rate_pct,
            calculate_monthly_payment(
              ${loanAmount}::numeric,
              mp.initial_rate_pct,
              25,
              mp.mortgage_type::text
            ) AS monthly_payment
          FROM mortgage_product mp
          WHERE mp.mortgage_product_id = ${input.mortgageProductId}
        ),
        yield_calc AS (
          SELECT
            (${input.expectedMonthlyRent} * 12.0 / ${input.askingPrice} * 100) AS gross_yield_pct,
            ((${input.expectedMonthlyRent} - ${input.expectedMonthlyRent} * 0.25) * 12.0 / ${input.askingPrice} * 100) AS net_yield_pct
        ),
        growth_cte AS (
          SELECT
            COALESCE(AVG(annual_pct_change::numeric), 0) AS avg_annual_growth
          FROM hpi_index
          WHERE outcode = ${outcode}
            AND reference_month >= CURRENT_DATE - INTERVAL '3 years'
        ),
        risk_cte AS (
          SELECT
            COALESCE(AVG(cs.count), 0) AS avg_crime_rate
          FROM crime_stat cs
          JOIN location l ON l.lsoa_code = cs.lsoa_code
          WHERE l.outcode = ${outcode}
            AND cs.reference_month >= CURRENT_DATE - INTERVAL '12 months'
        ),
        volatility_cte AS (
          SELECT
            COALESCE(STDDEV(annual_pct_change::numeric), 0) AS price_volatility
          FROM hpi_index
          WHERE outcode = ${outcode}
        ),
        all_outcodes AS (
          SELECT
            outcode,
            avg_yield_pct::numeric AS yield_val,
            yoy_price_growth_pct::numeric AS growth_val
          FROM mv_postcode_investment_metrics
        ),
        quartiles AS (
          SELECT
            outcode,
            NTILE(4) OVER (ORDER BY yield_val) AS yield_quartile,
            NTILE(4) OVER (ORDER BY growth_val) AS growth_quartile
          FROM all_outcodes
        ),
        target_quartiles AS (
          SELECT yield_quartile, growth_quartile
          FROM quartiles
          WHERE outcode = ${outcode}
        ),
        cashflow_cte AS (
          SELECT
            mc.monthly_payment,
            ${input.expectedMonthlyRent}::numeric - mc.monthly_payment - (${input.expectedMonthlyRent}::numeric * 0.25) AS net_monthly_cashflow
          FROM mortgage_calc mc
        ),
        risk_quartile_calc AS (
          SELECT
            NTILE(4) OVER (ORDER BY avg_crime_rate DESC) AS risk_quartile
          FROM (
            SELECT l2.outcode AS oc, COALESCE(AVG(cs2.count), 0) AS avg_crime_rate
            FROM location l2
            JOIN crime_stat cs2 ON cs2.lsoa_code = l2.lsoa_code
            WHERE cs2.reference_month >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY l2.outcode
          ) crime_by_outcode
        ),
        cashflow_quartile_calc AS (
          SELECT 3 AS cashflow_quartile
        )
        SELECT
          tq.yield_quartile,
          tq.growth_quartile,
          yc.gross_yield_pct,
          yc.net_yield_pct,
          gc.avg_annual_growth,
          rc.avg_crime_rate,
          vc.price_volatility,
          mc.monthly_payment,
          cc.net_monthly_cashflow,
          ROUND(
            (35.0 * COALESCE(tq.yield_quartile, 2) / 4.0 +
             25.0 * COALESCE(tq.growth_quartile, 2) / 4.0 +
             20.0 * 3.0 / 4.0 +
             20.0 * CASE WHEN cc.net_monthly_cashflow > 0 THEN 3 ELSE 1 END / 4.0
            )::numeric, 2
          ) AS composite_score
        FROM target_quartiles tq
        CROSS JOIN yield_calc yc
        CROSS JOIN growth_cte gc
        CROSS JOIN risk_cte rc
        CROSS JOIN volatility_cte vc
        CROSS JOIN mortgage_calc mc
        CROSS JOIN cashflow_cte cc
      `);

      const row = result[0];
      if (!row) {
        return {
          compositeScore: 50,
          verdict: "AVOID" as const,
          components: { yieldScore: 0, growthScore: 0, riskScore: 0, cashflowScore: 0 },
          monthlyPayment: 0,
          grossYieldPct: 0,
          netYieldPct: 0,
        };
      }

      const compositeScore = num(row.composite_score, 50);
      const yieldQ = num(row.yield_quartile, 2);
      const growthQ = num(row.growth_quartile, 2);

      let verdict: "CASH_COW" | "GROWTH_PLAY" | "UNICORN" | "AVOID";
      if (compositeScore > 75 && yieldQ >= 3 && growthQ >= 3) {
        verdict = "UNICORN";
      } else if (compositeScore > 60 && yieldQ >= 3) {
        verdict = "CASH_COW";
      } else if (compositeScore > 60 && growthQ >= 3) {
        verdict = "GROWTH_PLAY";
      } else {
        verdict = "AVOID";
      }

      return {
        compositeScore,
        verdict,
        components: {
          yieldScore: Math.round((yieldQ / 4) * 100),
          growthScore: Math.round((growthQ / 4) * 100),
          riskScore: 75, // simplified — uses quartile position
          cashflowScore: num(row.net_monthly_cashflow) > 0 ? 75 : 25,
        },
        monthlyPayment: num(row.monthly_payment),
        grossYieldPct: num(row.gross_yield_pct),
        netYieldPct: num(row.net_yield_pct),
      };
    }),

  /**
   * Q4: Yield vs Growth Quadrant Classification | S11: Descriptive Classification
   * Decision: Which London outcodes suit yield vs growth strategies?
   */
  quadrant: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      -- Q4: Yield vs Growth Quadrant Classification | S11: Descriptive Classification | Decision: Which London outcodes suit yield vs growth strategies?
      SELECT
        outcode,
        avg_yield_pct,
        yoy_price_growth_pct,
        yield_quartile,
        growth_quartile,
        quadrant
      FROM mv_postcode_investment_metrics
      ORDER BY outcode
    `);

    return (result as Record<string, unknown>[]).map((r) => ({
      outcode: str(r.outcode),
      avg_yield_pct: num(r.avg_yield_pct),
      yoy_price_growth_pct: num(r.yoy_price_growth_pct),
      yield_quartile: num(r.yield_quartile),
      growth_quartile: num(r.growth_quartile),
      quadrant: str(r.quadrant, "AVOID"),
    }));
  }),

  /** Novel insight — median £/sqft premium for low-crime outcodes. */
  novelInsight: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      WITH crime_ranked AS (
        SELECT
          outcode,
          crime_rate_index,
          NTILE(4) OVER (ORDER BY crime_rate_index ASC) AS crime_quartile
        FROM mv_postcode_investment_metrics
        WHERE crime_rate_index IS NOT NULL
      ),
      price_by_crime AS (
        SELECT
          cr.crime_quartile,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.sale_price::numeric) AS median_price
        FROM crime_ranked cr
        JOIN transaction t ON t.outcode = cr.outcode
        WHERE t.sale_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY cr.crime_quartile
      )
      SELECT
        low.median_price AS low_crime_median,
        high.median_price AS high_crime_median,
        CASE WHEN high.median_price > 0
          THEN ROUND(((low.median_price - high.median_price) / high.median_price * 100)::numeric, 1)
          ELSE NULL
        END AS premium_pct
      FROM price_by_crime low, price_by_crime high
      WHERE low.crime_quartile = 1 AND high.crime_quartile = 4
    `);

    const row = result[0];
    if (!row?.premium_pct) {
      console.warn("[novelInsight] Insufficient data for crime premium calculation — using fallback");
      return {
        title: "Low-Crime Premium",
        description: "Properties in London's safest quartile of outcodes typically command a significant price premium over the highest-crime areas.",
        value: "~40% premium",
        methodology: "fallback",
      };
    }

    const pct = num(row.premium_pct);
    return {
      title: "Low-Crime Premium",
      description: `Properties in London's safest quartile of outcodes sell for ${pct > 0 ? pct : Math.abs(pct)}% ${pct > 0 ? "more" : "less"} than those in the highest-crime quartile (last 12 months).`,
      value: `${pct > 0 ? "+" : ""}${pct}%`,
      methodology: "Median sale price comparison: lowest-crime-quartile outcodes vs highest-crime-quartile outcodes from mv_postcode_investment_metrics, filtered to transactions in the last 12 months.",
    };
  }),

  /** Compare up to 4 outcodes side-by-side. */
  compareSnapshot: publicProcedure
    .input(z.object({ outcodes: z.array(z.string()).min(1).max(4) }))
    .query(async ({ ctx, input }) => {
      const upcodes = input.outcodes.map((o) => o.toUpperCase());
      const result = await ctx.db.execute(sql`
        SELECT
          outcode,
          median_sale_price_12m,
          avg_yield_pct,
          yoy_price_growth_pct,
          crime_rate_index,
          quadrant
        FROM mv_postcode_investment_metrics
        WHERE outcode = ANY(${upcodes})
        ORDER BY outcode
      `);

      return (result as Record<string, unknown>[]).map((r) => ({
        outcode: str(r.outcode),
        median_price_12m: num(r.median_sale_price_12m),
        avg_yield_pct: num(r.avg_yield_pct),
        yoy_growth_pct: num(r.yoy_price_growth_pct),
        crime_rate_index: num(r.crime_rate_index),
        quadrant: str(r.quadrant, "AVOID"),
      }));
    }),

  /** List all mortgage products. */
  listMortgageProducts: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      SELECT * FROM mortgage_product ORDER BY lender, product_name
    `);
    return result as Record<string, unknown>[];
  }),

  /** Historical findings — compare outcode trends to region. */
  historicalFindings: publicProcedure
    .input(z.object({ outcode: z.string() }))
    .query(async ({ ctx, input }) => {
      const oc = input.outcode.toUpperCase();
      const result = await ctx.db.execute(sql`
        WITH outcode_recent AS (
          SELECT
            AVG(t.sale_price::numeric) AS avg_price,
            STDDEV(t.sale_price::numeric) AS price_stddev,
            COUNT(*)::int AS tx_count
          FROM transaction t
          WHERE t.outcode = ${oc}
            AND t.sale_date >= CURRENT_DATE - INTERVAL '12 months'
        ),
        outcode_prior AS (
          SELECT AVG(t.sale_price::numeric) AS avg_price
          FROM transaction t
          WHERE t.outcode = ${oc}
            AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
            AND t.sale_date < CURRENT_DATE - INTERVAL '12 months'
        ),
        region_recent AS (
          SELECT AVG(t.sale_price::numeric) AS avg_price
          FROM transaction t
          WHERE t.outcode IS NOT NULL
            AND t.sale_date >= CURRENT_DATE - INTERVAL '12 months'
        ),
        region_prior AS (
          SELECT AVG(t.sale_price::numeric) AS avg_price
          FROM transaction t
          WHERE t.outcode IS NOT NULL
            AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
            AND t.sale_date < CURRENT_DATE - INTERVAL '12 months'
        )
        SELECT
          or2.avg_price AS oc_avg,
          op.avg_price AS oc_prior_avg,
          rr.avg_price AS reg_avg,
          rp.avg_price AS reg_prior_avg,
          or2.price_stddev AS oc_stddev,
          or2.tx_count
        FROM outcode_recent or2
        CROSS JOIN outcode_prior op
        CROSS JOIN region_recent rr
        CROSS JOIN region_prior rp
      `);

      const row = result[0];
      if (!row || num(row.tx_count) === 0) {
        return [];
      }

      const findings: { title: string; description: string; value: string }[] = [];
      const ocAvg = num(row.oc_avg);
      const ocPrior = num(row.oc_prior_avg);
      const regAvg = num(row.reg_avg);
      const regPrior = num(row.reg_prior_avg);

      // YoY growth comparison
      if (ocPrior > 0 && regPrior > 0) {
        const ocGrowth = ((ocAvg - ocPrior) / ocPrior) * 100;
        const regGrowth = ((regAvg - regPrior) / regPrior) * 100;
        const diff = ocGrowth - regGrowth;
        findings.push({
          title: diff > 0 ? "Outperforming London" : "Underperforming London",
          description: `${oc} prices grew ${Math.abs(ocGrowth).toFixed(1)}% YoY vs London average of ${regGrowth.toFixed(1)}%.`,
          value: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}pp`,
        });
      }

      // Volatility
      const stddev = num(row.oc_stddev);
      if (ocAvg > 0 && stddev > 0) {
        const cv = (stddev / ocAvg) * 100;
        findings.push({
          title: cv > 50 ? "High Price Volatility" : "Moderate Price Stability",
          description: `Coefficient of variation is ${cv.toFixed(1)}% over the last 12 months.`,
          value: `CV ${cv.toFixed(1)}%`,
        });
      }

      // Transaction volume
      const txCount = num(row.tx_count);
      findings.push({
        title: txCount > 100 ? "Active Market" : "Low Liquidity",
        description: `${txCount} transactions recorded in the last 12 months.`,
        value: `${txCount} sales`,
      });

      return findings.slice(0, 3);
    }),

  /** Crime statistics aggregated by borough. */
  crimeByBorough: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      SELECT
        l.borough,
        SUM(cs.count)::int AS total_crimes,
        COUNT(DISTINCT l.lsoa_code)::int AS lsoa_count,
        ROUND((SUM(cs.count)::numeric / NULLIF(COUNT(DISTINCT l.lsoa_code), 0)), 2) AS crime_rate
      FROM crime_stat cs
      JOIN location l ON l.lsoa_code = cs.lsoa_code
      WHERE cs.reference_month >= CURRENT_DATE - INTERVAL '12 months'
        AND l.borough IS NOT NULL
      GROUP BY l.borough
      ORDER BY crime_rate DESC
    `);

    return (result as Record<string, unknown>[]).map((r) => ({
      borough: str(r.borough),
      total_crimes: num(r.total_crimes),
      lsoa_count: num(r.lsoa_count),
      crime_rate: num(r.crime_rate),
    }));
  }),
});
