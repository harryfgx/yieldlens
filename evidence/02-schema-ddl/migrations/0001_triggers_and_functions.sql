-- 0001: Audit timestamp trigger function + triggers on location and property
-- Automatically sets updated_at = NOW() on every UPDATE.

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_location
  BEFORE UPDATE ON "location"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_property
  BEFORE UPDATE ON "property"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
