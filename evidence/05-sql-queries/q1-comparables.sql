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
  WHERE t.outcode = $1            -- e.g. 'SE16'
    AND p.bedrooms = $2           -- e.g. 2
    AND p.property_type = $3      -- e.g. 'FLAT'
    AND (p.floor_area_sqm IS NULL OR p.floor_area_sqm BETWEEN $4 AND $5)  -- ±20%
    AND t.sale_date >= CURRENT_DATE - INTERVAL '24 months'
)
SELECT
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sale_price) AS p25,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_price) AS median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sale_price) AS p75,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gbp_per_sqft) AS median_gbp_per_sqft,
  COUNT(*)::int AS comparable_count
FROM comparables;
