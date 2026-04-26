import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

async function verify() {
  const checks: { name: string; pass: boolean }[] = [];

  // 8 tables
  const tables =
    await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
  const tableCount = tables.length;
  checks.push({ name: `8 tables (found ${tableCount})`, pass: tableCount === 8 });

  // 3 functions
  const funcs =
    await sql`SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' AND routine_name IN ('trigger_set_timestamp', 'calculate_monthly_payment', 'refresh_postcode_metrics')`;
  checks.push({ name: `3 functions (found ${funcs.length})`, pass: funcs.length === 3 });

  // 1 materialised view
  const matviews =
    await sql`SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'`;
  checks.push({ name: `1 matview (found ${matviews.length})`, pass: matviews.length === 1 });

  // 1 role
  const roles =
    await sql`SELECT rolname FROM pg_roles WHERE rolname = 'app_readonly'`;
  checks.push({ name: `1 role app_readonly (found ${roles.length})`, pass: roles.length === 1 });

  for (const c of checks) {
    console.log(`${c.pass ? "✓" : "✗"} ${c.name}`);
  }

  await sql.end();

  if (checks.some((c) => !c.pass)) {
    console.error("\nSchema verification FAILED");
    process.exit(1);
  }
  console.log("\n✓ All schema checks passed");
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
