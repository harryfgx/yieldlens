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
    $1 AS geo_value,  -- e.g. 'SE16'
    month,
    avg_price,
    AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
    CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
      THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
      ELSE NULL
    END AS yoy_growth_pct
  FROM monthly_prices
  WHERE outcode = $1
),
outcode_level AS (
  SELECT
    'outcode' AS geo_level,
    $1 AS geo_value,
    month,
    avg_price,
    AVG(avg_price) OVER (ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS rolling_12m_avg,
    CASE WHEN LAG(avg_price, 12) OVER (ORDER BY month) > 0
      THEN ROUND(((avg_price - LAG(avg_price, 12) OVER (ORDER BY month)) / LAG(avg_price, 12) OVER (ORDER BY month) * 100)::numeric, 2)
      ELSE NULL
    END AS yoy_growth_pct
  FROM monthly_prices
  WHERE outcode = $1
),
area_agg AS (
  SELECT
    DATE_TRUNC('month', t.sale_date::timestamp)::date AS month,
    AVG(t.sale_price::numeric) AS avg_price
  FROM transaction t
  WHERE t.outcode LIKE $2 || '%'  -- e.g. 'SE%'
    AND t.sale_date >= CURRENT_DATE - INTERVAL '5 years'
  GROUP BY DATE_TRUNC('month', t.sale_date::timestamp)
),
area_level AS (
  SELECT
    'area' AS geo_level,
    $2 AS geo_value,
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
ORDER BY geo_level, month;
