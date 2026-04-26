/**
 * Ingest EPC Register data — updates property attributes.
 * Gracefully skips if EPC_API_KEY is not set.
 */
import { sql } from "./lib/db.js";
import { createLogger } from "./lib/logger.js";

const log = createLogger("epc");

export async function ingestEpc() {
  const start = Date.now();
  const apiKey = process.env.EPC_API_KEY;

  if (!apiKey) {
    log.warn("EPC_API_KEY not set — skipping EPC ingestion. Set it in .env to enable.");
    return { inserted: 0, skipped: true };
  }

  log.info("Starting EPC ingestion");

  // London local authority codes for EPC API
  const londonAuthorities = [
    "E09000001", "E09000002", "E09000003", "E09000004", "E09000005",
    "E09000006", "E09000007", "E09000008", "E09000009", "E09000010",
    "E09000011", "E09000012", "E09000013", "E09000014", "E09000015",
    "E09000016", "E09000017", "E09000018", "E09000019", "E09000020",
    "E09000021", "E09000022", "E09000023", "E09000024", "E09000025",
    "E09000026", "E09000027", "E09000028", "E09000029", "E09000030",
    "E09000031", "E09000032", "E09000033",
  ];

  let updated = 0;

  for (const la of londonAuthorities) {
    try {
      const url = `https://epc.opendatacommunities.org/api/v1/domestic/search?local-authority=${la}&size=1000`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        log.warn(`EPC API error for ${la}: ${res.status}`);
        continue;
      }

      const data = (await res.json()) as {
        rows: Array<{
          uprn?: string;
          "number-habitable-rooms"?: string;
          "total-floor-area"?: string;
          "current-energy-rating"?: string;
          "current-energy-efficiency"?: string;
          "construction-age-band"?: string;
        }>;
      };

      for (const row of data.rows ?? []) {
        const uprn = parseInt(row.uprn ?? "", 10);
        if (isNaN(uprn)) continue;

        const bedrooms = parseInt(row["number-habitable-rooms"] ?? "", 10);
        const floorArea = parseFloat(row["total-floor-area"] ?? "");
        const epcRating = row["current-energy-rating"] ?? null;
        const epcScore = parseInt(row["current-energy-efficiency"] ?? "", 10);
        const ageBand = row["construction-age-band"] ?? null;

        await sql`
          UPDATE property SET
            bedrooms = COALESCE(${isNaN(bedrooms) ? null : bedrooms}, bedrooms),
            floor_area_sqm = COALESCE(${isNaN(floorArea) ? null : floorArea}, floor_area_sqm),
            epc_rating = COALESCE(${epcRating}, epc_rating),
            epc_score = COALESCE(${isNaN(epcScore) ? null : epcScore}, epc_score),
            construction_age_band = COALESCE(${ageBand}, construction_age_band),
            updated_at = NOW()
          WHERE uprn = ${uprn}
        `;
        updated++;
      }

      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      log.warn(`Error processing LA ${la}`, { error: String(e) });
    }
  }

  log.info("EPC ingestion complete", { updated, durationMs: Date.now() - start });
  return { inserted: updated, skipped: false };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestEpc()
    .then(() => sql.end())
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); sql.end().then(() => process.exit(1)); });
}
