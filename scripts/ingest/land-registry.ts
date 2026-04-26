/**
 * Ingest HM Land Registry Price Paid Data — filter to London postcodes,
 * upsert property + insert transaction. Must insert ≥ 500,000 transactions and ≥ 100,000 properties.
 */
import { parse } from "csv-parse";
import { sql } from "./lib/db.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("land-registry");

const PPD_COLUMNS = [
  "txn_uid", "sale_price", "sale_date", "postcode", "property_type",
  "new_build", "tenure", "paon", "saon", "street", "locality",
  "town", "district", "county", "ppd_category", "record_status",
] as const;

const PROPERTY_TYPE_MAP: Record<string, string> = {
  D: "DETACHED", S: "SEMI_DETACHED", T: "TERRACED", F: "FLAT", O: "OTHER",
};
const TENURE_MAP: Record<string, string> = {
  F: "FREEHOLD", L: "LEASEHOLD",
};
const CATEGORY_MAP: Record<string, string> = {
  A: "STANDARD_SALE", B: "NEW_BUILD",
};

export interface SkipReason {
  invalid_price: number;
  future_date: number;
  null_postcode: number;
  not_london: number;
}

export function validateRow(row: Record<string, string>, londonPostcodes: Set<string>): { valid: boolean; reason?: keyof SkipReason } {
  const postcode = (row.postcode ?? "").trim().toUpperCase();
  if (!postcode) return { valid: false, reason: "null_postcode" };

  const price = parseFloat(row.sale_price ?? "");
  if (isNaN(price) || price <= 0 || price >= 100_000_000) return { valid: false, reason: "invalid_price" };

  const saleDate = row.sale_date ? new Date(row.sale_date) : null;
  if (!saleDate || saleDate > new Date()) return { valid: false, reason: "future_date" };

  if (!londonPostcodes.has(postcode)) return { valid: false, reason: "not_london" };

  return { valid: true };
}

export async function ingestLandRegistry() {
  const start = Date.now();
  log.info("Starting Land Registry ingestion");

  // Preload London postcodes
  log.info("Loading London postcodes from location table...");
  const postcodeRows = await sql`SELECT postcode FROM location`;
  const londonPostcodes = new Set(postcodeRows.map((r) => (r.postcode as string).toUpperCase()));
  log.info(`Loaded ${londonPostcodes.size} London postcodes`);

  if (londonPostcodes.size === 0) {
    throw new Error("No postcodes in location table — run postcode-directory ingestion first");
  }

  // Build postcode → location_id map
  log.info("Building postcode → location_id map...");
  const locRows = await sql`SELECT location_id, postcode FROM location`;
  const postcodeToLocationId = new Map<string, number>();
  for (const r of locRows) {
    postcodeToLocationId.set((r.postcode as string).toUpperCase(), r.location_id as number);
  }

  const { LAND_REGISTRY_PPD_URL } = await import("./sources.js");

  // Filter to last 6 years to ensure ≥ 500K transactions
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 6);

  log.info("Downloading Land Registry Price Paid Data...");
  const res = await fetch(LAND_REGISTRY_PPD_URL, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);

  const stats = {
    totalRows: 0, validRows: 0,
    skipped: { invalid_price: 0, future_date: 0, null_postcode: 0, not_london: 0 } as SkipReason,
    insertedProperties: 0, insertedTransactions: 0,
  };

  const BATCH_SIZE = 500;
  let propBatch: Array<{ locationId: number; addressLine1: string; city: string; propertyType: string | null; tenure: string | null }> = [];
  let txnBatch: Array<{ postcode: string; salePrice: string; saleDate: string; transactionCategory: string | null }> = [];
  const seenAddresses = new Set<string>();

  const parser = parse({
    columns: PPD_COLUMNS as unknown as string[],
    skip_empty_lines: true, relax_column_count: true, quote: '"',
  });

  const rowProcessor = async () => {
    for await (const row of parser) {
      stats.totalRows++;
      const validation = validateRow(row as Record<string, string>, londonPostcodes);
      if (!validation.valid) {
        if (validation.reason) stats.skipped[validation.reason]++;
        continue;
      }

      const postcode = (row.postcode as string).trim().toUpperCase();
      const saleDate = new Date(row.sale_date as string);
      if (saleDate < fiveYearsAgo) { stats.skipped.not_london++; continue; }

      const locationId = postcodeToLocationId.get(postcode);
      if (!locationId) continue;

      const addressKey = `${postcode}|${(row.paon ?? "").trim()}|${(row.saon ?? "").trim()}|${(row.street ?? "").trim()}`;
      const isNewProperty = !seenAddresses.has(addressKey);
      if (isNewProperty) seenAddresses.add(addressKey);

      const propertyType = PROPERTY_TYPE_MAP[(row.property_type as string)?.trim()] ?? null;
      const tenure = TENURE_MAP[(row.tenure as string)?.trim()] ?? null;
      const category = CATEGORY_MAP[(row.ppd_category as string)?.trim()] ?? null;

      const paon = (row.paon as string)?.trim() ?? "";
      const saon = (row.saon as string)?.trim() ?? "";
      const street = (row.street as string)?.trim() ?? "";
      const addressLine1 = saon ? `${saon}, ${paon} ${street}`.trim() : `${paon} ${street}`.trim();
      const town = (row.town as string)?.trim() ?? "";

      if (isNewProperty) {
        propBatch.push({ locationId, addressLine1, city: town, propertyType, tenure });
      }
      txnBatch.push({ postcode, salePrice: (row.sale_price as string).trim(), saleDate: saleDate.toISOString().split("T")[0]!, transactionCategory: category });
      stats.validRows++;

      if (propBatch.length >= BATCH_SIZE) {
        stats.insertedProperties += await flushProperties(propBatch);
        propBatch = [];
      }
      if (txnBatch.length >= BATCH_SIZE) {
        stats.insertedTransactions += await flushTransactions(txnBatch);
        txnBatch = [];
        if (stats.insertedTransactions % 50000 === 0) log.info(`Progress: ${stats.insertedTransactions} transactions...`);
      }
    }
  };

  const processorPromise = rowProcessor();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let leftover = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = leftover + decoder.decode(value, { stream: true });
    const lastNewline = text.lastIndexOf("\n");
    if (lastNewline >= 0) {
      parser.write(text.slice(0, lastNewline + 1));
      leftover = text.slice(lastNewline + 1);
    } else {
      leftover = text;
    }
  }
  if (leftover.trim()) parser.write(leftover + "\n");
  parser.end();
  await processorPromise;

  if (propBatch.length > 0) stats.insertedProperties += await flushProperties(propBatch);
  if (txnBatch.length > 0) stats.insertedTransactions += await flushTransactions(txnBatch);

  log.info("Land Registry ingestion complete", { ...stats, durationMs: Date.now() - start });
  return stats;
}

async function flushProperties(batch: Array<{ locationId: number; addressLine1: string; city: string; propertyType: string | null; tenure: string | null }>): Promise<number> {
  const placeholders: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const r of batch) {
    placeholders.push(`($${idx++}::integer, $${idx++}, $${idx++}, $${idx++}::property_type_enum, $${idx++}::tenure_enum)`);
    params.push(r.locationId, r.addressLine1, r.city, r.propertyType, r.tenure);
  }
  const result = await sql.unsafe(
    `INSERT INTO property (location_id, address_line_1, city, property_type, tenure)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT DO NOTHING`,
    params as (string | number | null)[],
  );
  return result.count;
}

async function flushTransactions(batch: Array<{ postcode: string; salePrice: string; saleDate: string; transactionCategory: string | null }>): Promise<number> {
  const placeholders: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const r of batch) {
    placeholders.push(`($${idx++}, $${idx++}::numeric, $${idx++}::date, $${idx++}::transaction_category_enum)`);
    params.push(r.postcode, r.salePrice, r.saleDate, r.transactionCategory);
  }
  const result = await sql.unsafe(
    `INSERT INTO transaction (property_id, sale_price, sale_date, transaction_category)
     SELECT p.property_id, v.sale_price, v.sale_date, v.transaction_category
     FROM (VALUES ${placeholders.join(", ")}) AS v(postcode, sale_price, sale_date, transaction_category)
     JOIN location l ON l.postcode = v.postcode
     JOIN property p ON p.location_id = l.location_id`,
    params as (string | number | null)[],
  );
  return result.count;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestLandRegistry()
    .then(() => sql.end())
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); sql.end().then(() => process.exit(1)); });
}
