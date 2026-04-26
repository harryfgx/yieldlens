/**
 * Ingest ONS Postcode Directory — filter to London outcodes, upsert into location table.
 * Must insert ≥ 100,000 rows.
 *
 * Uses the NHS Postcode Directory London region file (gridy56) which contains
 * all London postcodes with grid references and LSOA codes.
 */
import { parse } from "csv-parse";
import { createReadStream, createWriteStream, mkdirSync, readdirSync, readFileSync, statSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import { sql } from "./lib/db.js";
import { createLogger } from "./lib/logger.js";
import { LONDON_OUTCODE_PREFIXES } from "./sources.js";

const log = createLogger("postcode-directory");

const LONDON_POSTCODES_URL = "https://files.digital.nhs.uk/assets/ods/current/gridy56.zip";

function extractOutcode(postcode: string): string | null {
  const trimmed = postcode.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");
  return parts.length >= 2 ? parts[0]!.toUpperCase() : null;
}

function isLondonOutcode(outcode: string): boolean {
  return LONDON_OUTCODE_PREFIXES.some((prefix) => {
    if (prefix.length === 1) {
      return outcode.startsWith(prefix) && outcode.length > 1 && /\d/.test(outcode[1]!);
    }
    return outcode.startsWith(prefix) && (outcode.length === prefix.length || /\d/.test(outcode[prefix.length]!));
  });
}

export async function ingestPostcodeDirectory() {
  const start = Date.now();
  log.info("Starting postcode directory ingestion");

  const tmpDir = join(process.cwd(), ".tmp");
  mkdirSync(tmpDir, { recursive: true });

  const zipPath = join(tmpDir, "gridy56.zip");
  const extractDir = join(tmpDir, "postcodes");
  mkdirSync(extractDir, { recursive: true });

  log.info("Downloading NHS PD London region file...");
  const res = await fetch(LONDON_POSTCODES_URL, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
  const writer = createWriteStream(zipPath);
  // @ts-expect-error Node fetch body is a ReadableStream
  await pipeline(res.body, writer);
  log.info("Download complete");

  log.info("Extracting ZIP...");
  const { execSync } = await import("child_process");
  execSync(`unzip -o -q "${zipPath}" -d "${extractDir}"`, { maxBuffer: 1024 * 1024 * 200 });

  // Read header from gridlink_header.csv
  const headerPath = join(extractDir, "gridlink_header.csv");
  const headerLine = readFileSync(headerPath, "utf-8").trim().split("\n")[0]!;
  const columns = headerLine.split(",").map((c) => c.replace(/"/g, "").trim());
  log.info("Columns", { count: columns.length, sample: columns.slice(0, 10) });

  // Find the data CSV (largest file, not the header)
  const dataPath = join(extractDir, "gridy56.csv");
  log.info("Data file", { path: dataPath, size: statSync(dataPath).size });

  // Parse data CSV using header columns
  const BATCH_SIZE = 2000;
  let batch: Array<{
    postcode: string;
    outcode: string;
    borough: string | null;
    region: string | null;
    lsoaCode: string | null;
    lat: number | null;
    lng: number | null;
  }> = [];
  let inserted = 0;
  let skipped = 0;

  const parser = createReadStream(dataPath).pipe(
    parse({ columns, skip_empty_lines: true, relax_column_count: true, quote: '"' }),
  );

  for await (const row of parser) {
    const pcd = ((row.PCDS || row.PCD2 || "") as string).trim();
    if (!pcd) { skipped++; continue; }

    const outcode = extractOutcode(pcd);
    if (!outcode || !isLondonOutcode(outcode)) { skipped++; continue; }

    // Skip terminated postcodes
    const doterm = ((row.DOTERM || "") as string).trim();
    if (doterm) { skipped++; continue; }

    // Grid references — OSEAST1M and OSNRTH1M are 1m resolution easting/northing
    const easting = parseFloat((row.OSEAST1M || "") as string);
    const northing = parseFloat((row.OSNRTH1M || "") as string);

    // Convert OSGB36 to approximate WGS84 for London area
    let lat: number | null = null;
    let lng: number | null = null;
    if (!isNaN(easting) && !isNaN(northing) && easting > 0 && northing > 0) {
      // Helmert transformation approximation for London
      lat = 49.766 + (northing / 111320);
      lng = -7.557 + (easting / (111320 * Math.cos(51.5 * Math.PI / 180)));
    }

    const lsoaCode = ((row.LSOA11 || row.LSOA21 || "") as string).trim() || null;

    batch.push({
      postcode: pcd.toUpperCase(),
      outcode,
      borough: null,
      region: "London",
      lsoaCode,
      lat,
      lng,
    });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      inserted += batch.length;
      batch = [];
      if (inserted % 20000 === 0) log.info(`Inserted ${inserted} rows...`);
    }
  }

  if (batch.length > 0) {
    await flushBatch(batch);
    inserted += batch.length;
  }

  log.info("Postcode directory ingestion complete", { inserted, skipped, durationMs: Date.now() - start });

  // Clean up
  try {
    const { rmSync } = await import("fs");
    rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }

  return { inserted, skipped };
}

async function flushBatch(
  batch: Array<{
    postcode: string;
    outcode: string;
    borough: string | null;
    region: string | null;
    lsoaCode: string | null;
    lat: number | null;
    lng: number | null;
  }>,
) {
  // Build a single INSERT with multiple value rows using raw SQL
  const placeholders: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const r of batch) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::numeric, $${idx++}::numeric)`);
    params.push(r.postcode, r.outcode, r.borough, r.region, r.lsoaCode, r.lat, r.lng);
  }

  await sql.unsafe(
    `INSERT INTO location (postcode, outcode, borough, region, lsoa_code, lat, lng)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (postcode) DO UPDATE SET
       outcode = EXCLUDED.outcode,
       borough = COALESCE(EXCLUDED.borough, location.borough),
       region = EXCLUDED.region,
       lsoa_code = COALESCE(EXCLUDED.lsoa_code, location.lsoa_code),
       lat = COALESCE(EXCLUDED.lat, location.lat),
       lng = COALESCE(EXCLUDED.lng, location.lng),
       updated_at = NOW()`,
    params as (string | number | null)[],
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestPostcodeDirectory()
    .then(() => sql.end())
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      sql.end().then(() => process.exit(1));
    });
}
