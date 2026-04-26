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
