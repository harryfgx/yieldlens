-- Q3: Composite Investment Score | S11: Diagnostic | Decision: All factors considered, how good is this BTL investment?
WITH mortgage_calc AS (
  SELECT
    mp.mortgage_product_id,
    mp.mortgage_type,
    mp.initial_rate_pct,
    calculate_monthly_payment(
      $1::numeric,           -- loan amount (asking_price * (1 - deposit_pct/100))
      mp.initial_rate_pct,
      25,
      mp.mortgage_type::text
    ) AS monthly_payment
  FROM mortgage_product mp
  WHERE mp.mortgage_product_id = $2  -- mortgage_product_id
),
yield_calc AS (
  SELECT
    ($3 * 12.0 / $4 * 100) AS gross_yield_pct,       -- expected_monthly_rent * 12 / asking_price * 100
    (($3 - $3 * 0.25) * 12.0 / $4 * 100) AS net_yield_pct  -- net of 25% costs
),
growth_cte AS (
  SELECT
    COALESCE(AVG(annual_pct_change::numeric), 0) AS avg_annual_growth
  FROM hpi_index
  WHERE outcode = $5  -- outcode
    AND reference_month >= CURRENT_DATE - INTERVAL '3 years'
),
risk_cte AS (
  SELECT
    COALESCE(AVG(cs.count), 0) AS avg_crime_rate
  FROM crime_stat cs
  JOIN location l ON l.lsoa_code = cs.lsoa_code
  WHERE l.outcode = $5
    AND cs.reference_month >= CURRENT_DATE - INTERVAL '12 months'
),
volatility_cte AS (
  SELECT
    COALESCE(STDDEV(annual_pct_change::numeric), 0) AS price_volatility
  FROM hpi_index
  WHERE outcode = $5
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
  WHERE outcode = $5
),
cashflow_cte AS (
  SELECT
    mc.monthly_payment,
    $3::numeric - mc.monthly_payment - ($3::numeric * 0.25) AS net_monthly_cashflow
  FROM mortgage_calc mc
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
CROSS JOIN cashflow_cte cc;
