# Expand-Contract Migration: Renaming `property.address_line_1` to `property.primary_address_line`

This worked example demonstrates a backward-compatible schema migration using the expand-contract pattern, ensuring zero-downtime deployment.

## Step 1: ADD new column (nullable)

```sql
ALTER TABLE property
  ADD COLUMN primary_address_line VARCHAR;
```

**Deployment note:** This is a non-breaking change. The existing application continues to read/write `address_line_1`. The new column accepts NULLs, so no data migration is needed yet.

## Step 2: BACKFILL existing data

```sql
UPDATE property
  SET primary_address_line = address_line_1
  WHERE primary_address_line IS NULL;
```

**Deployment note:** Run in batches of 10,000 rows to avoid long-running transactions on Supabase. Monitor `pg_stat_activity` for lock contention. This can run while the application is live.

## Step 3: APP reads from BOTH columns

```typescript
// In the application layer, read from new column with fallback
const address = row.primary_address_line ?? row.address_line_1;
```

**Deployment note:** Deploy the application update. Both old and new instances can coexist — old instances read `address_line_1`, new instances prefer `primary_address_line`. This is the "expand" phase.

## Step 4: APP writes to BOTH columns

```typescript
// Write to both columns during transition
await db.update(property).set({
  address_line_1: value,
  primary_address_line: value,
}).where(eq(property.propertyId, id));
```

**Deployment note:** Once all application instances are updated, every new write populates both columns. Run the backfill query from Step 2 one final time to catch any rows written between Steps 2 and 4.

## Step 5: DROP old column (contract)

```sql
-- Add NOT NULL constraint first
ALTER TABLE property
  ALTER COLUMN primary_address_line SET NOT NULL;

-- Remove old column
ALTER TABLE property
  DROP COLUMN address_line_1;
```

**Deployment note:** Only execute after confirming: (a) all application instances read from `primary_address_line`; (b) no queries reference `address_line_1`; (c) backfill is 100% complete. This is the "contract" phase. Schedule during a maintenance window. The Drizzle schema must be updated to remove the old column definition before this migration runs.

## Summary

| Step | Schema Change | App Change | Backward Compatible |
|------|--------------|------------|-------------------|
| 1 | ADD COLUMN nullable | None | ✅ |
| 2 | Backfill data | None | ✅ |
| 3 | None | Read both | ✅ |
| 4 | None | Write both | ✅ |
| 5 | DROP old column | Read/write new only | ⚠️ Requires all instances updated |
