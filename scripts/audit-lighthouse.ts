import "dotenv/config";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import fs from "fs";
import path from "path";

const URL = process.env.PRODUCTION_URL ?? "http://localhost:3000";
const OUT_FILE = path.resolve("evidence/06-dashboard/lighthouse-desktop.json");

async function main() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });
  const port = chrome.port;

  // Warm-up run
  console.log("🔥 Warm-up run...");
  await lighthouse(URL, { port, output: "json", onlyCategories: ["performance"] });

  // Scored run
  console.log("📊 Scored run...");
  const result = await lighthouse(URL, {
    port,
    output: "json",
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1920, height: 1080, deviceScaleFactor: 1, disabled: false },
    throttling: { cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, throughputKbps: 0, rttMs: 0 },
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });

  await chrome.kill();

  if (!result?.lhr) {
    console.error("❌ Lighthouse returned no results");
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(result.lhr, null, 2));
  console.log(`Report: ${OUT_FILE}`);

  const categories = result.lhr.categories;
  const scores: Record<string, number> = {};
  let allPass = true;

  for (const [key, cat] of Object.entries(categories)) {
    const score = Math.round((cat.score ?? 0) * 100);
    scores[key] = score;
    const pass = score >= 90;
    console.log(`  ${pass ? "✅" : "❌"} ${cat.title}: ${score}`);
    if (!pass) allPass = false;
  }

  if (!allPass) {
    console.error("\n❌ Lighthouse audit FAILED — some categories below 90");
    process.exit(1);
  }
  console.log("\n✅ Lighthouse audit PASSED — all categories ≥ 90");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
