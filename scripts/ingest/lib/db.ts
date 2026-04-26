/** Postgres.js client for bulk ingestion scripts — uses DIRECT_URL (port 5432). */
import postgres from "postgres";
import "dotenv/config";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("Missing DIRECT_URL — see ralph/context/05-verification-scripts.md");
  process.exit(1);
}

export const sql = postgres(url, { max: 4 });
