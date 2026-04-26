import postgres from "postgres";
import { config } from "dotenv";

config();

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("Missing DIRECT_URL in .env");
  process.exit(1);
}

const sql = postgres(directUrl, { max: 1 });

try {
  const result = await sql`SELECT 1 AS ok`;
  if (result[0]?.ok === 1) {
    console.log("✓ Database connection verified");
  } else {
    throw new Error("Unexpected result");
  }
} catch (e) {
  console.error("✗ Database connection failed:", e);
  process.exit(1);
} finally {
  await sql.end();
}
