-- Q4: Yield vs Growth Quadrant Classification | S11: Descriptive Classification | Decision: Which London outcodes suit yield vs growth strategies?
SELECT
  outcode,
  avg_yield_pct,
  yoy_price_growth_pct,
  yield_quartile,
  growth_quartile,
  quadrant
FROM mv_postcode_investment_metrics
ORDER BY outcode;
