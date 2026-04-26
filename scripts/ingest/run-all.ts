/**
 * Run all ingestion scripts in dependency order:
 * 1. postcode-directory (serial — must complete first)
 * 2. land-registry + mortgage-products (parallel)
 * 3. ons-hpi + ons-rental + police-crime + epc (parallel)
 * 4. Refresh materialised view
 */
import { sql } from "./lib/db.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("run-all");

async function main() {
  const start = Date.now();
  log.info("Starting full ingestion pipeline");

  // Phase 1: Postcode directory (serial — other scripts depend on it)
  log.info("Phase 1: Postcode directory...");
  const { ingestPostcodeDirectory } = await import("./postcode-directory.js");
  const postcodeResult = await ingestPostcodeDirectory();
  log.info("Phase 1 complete", { postcodes: postcodeResult.inserted });

  // Phase 2: Land Registry + Mortgage Products (parallel)
  log.info("Phase 2: Land Registry + Mortgage Products (parallel)...");
  const { ingestLandRegistry } = await import("./land-registry.js");
  const { ingestMortgageProducts } = await import("./mortgage-products.js");
  const [lrResult, mpResult] = await Promise.all([
    ingestLandRegistry(),
    ingestMortgageProducts(),
  ]);
  log.info("Phase 2 complete", {
    transactions: lrResult.insertedTransactions,
    properties: lrResult.insertedProperties,
    mortgageProducts: mpResult.inserted,
  });

  // Phase 3: ONS HPI + ONS Rental + Police Crime + EPC (parallel)
  log.info("Phase 3: ONS HPI + ONS Rental + Police Crime + EPC (parallel)...");
  const { ingestOnsHpi } = await import("./ons-hpi.js");
  const { ingestOnsRental } = await import("./ons-rental.js");
  const { ingestPoliceCrime } = await import("./police-crime.js");
  const { ingestEpc } = await import("./epc.js");
  const [hpiResult, rentalResult, crimeResult, epcResult] = await Promise.all([
    ingestOnsHpi(),
    ingestOnsRental(),
    ingestPoliceCrime(),
    ingestEpc(),
  ]);
  log.info("Phase 3 complete", {
    hpi: hpiResult.inserted,
    rental: rentalResult.inserted,
    crime: crimeResult.inserted,
    epc: epcResult.inserted,
  });

  // Phase 4: Refresh materialised view
  log.info("Phase 4: Refreshing materialised view...");
  try {
    await sql`SELECT refresh_postcode_metrics()`;
    log.info("Materialised view refreshed");
  } catch (e) {
    log.warn("Matview refresh failed — may need data in all tables first", { error: String(e) });
    // Try creating the matview if it doesn't exist
    try {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const matviewSql = readFileSync(join(process.cwd(), "drizzle/0004_materialised_view.sql"), "utf-8");
      await sql.unsafe(matviewSql);
      log.info("Materialised view created and refreshed");
    } catch (e2) {
      log.warn("Could not create matview", { error: String(e2) });
    }
  }

  const totalDuration = Date.now() - start;
  log.info("Full ingestion pipeline complete", {
    totalDurationMs: totalDuration,
    totalDurationMin: Math.round(totalDuration / 60000),
    summary: {
      postcodes: postcodeResult.inserted,
      properties: lrResult.insertedProperties,
      transactions: lrResult.insertedTransactions,
      hpi: hpiResult.inserted,
      rental: rentalResult.inserted,
      crime: crimeResult.inserted,
      epc: epcResult.inserted,
      mortgageProducts: mpResult.inserted,
    },
  });
}

main()
  .then(() => sql.end())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Ingestion pipeline failed:", e);
    sql.end().then(() => process.exit(1));
  });
