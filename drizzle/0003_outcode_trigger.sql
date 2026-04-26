-- 0003: Trigger to maintain transaction.outcode from property → location
-- Enforces the controlled denormalisation: transaction.outcode always matches
-- the outcode derived from property.location_id → location.outcode.

CREATE OR REPLACE FUNCTION maintain_transaction_outcode()
RETURNS TRIGGER AS $$
BEGIN
  SELECT l.outcode INTO NEW.outcode
  FROM "property" p
  JOIN "location" l ON l.location_id = p.location_id
  WHERE p.property_id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maintain_transaction_outcode
  BEFORE INSERT OR UPDATE ON "transaction"
  FOR EACH ROW
  EXECUTE FUNCTION maintain_transaction_outcode();
