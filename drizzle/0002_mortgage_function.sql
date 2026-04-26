-- 0002: Stored function — calculate_monthly_payment
-- Used by Q3 (Composite Investment Score) to compute mortgage payments.
-- IMMUTABLE: same inputs always produce same output.

CREATE OR REPLACE FUNCTION calculate_monthly_payment(
  principal numeric,
  annual_rate_pct numeric,
  term_years integer,
  mortgage_type text
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r numeric;
  n integer;
BEGIN
  IF principal = 0 THEN
    RETURN 0;
  END IF;

  IF mortgage_type = 'INTEREST_ONLY' THEN
    RETURN ROUND(principal * annual_rate_pct / 100.0 / 12.0, 2);
  END IF;

  -- REPAYMENT
  n := term_years * 12;

  IF annual_rate_pct = 0 THEN
    RETURN ROUND(principal / n, 2);
  END IF;

  r := annual_rate_pct / 100.0 / 12.0;
  RETURN ROUND(principal * r * POWER(1 + r, n) / (POWER(1 + r, n) - 1), 2);
END;
$$;
