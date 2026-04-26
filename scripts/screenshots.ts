import "dotenv/config";
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.PRODUCTION_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("evidence/06-dashboard");

const pages: { name: string; route: string; file: string }[] = [
  { name: "Landing", route: "/", file: "01-landing.png" },
  { name: "Property Analyser", route: "/analyse", file: "03-property-analyser.png" },
  { name: "Compare", route: "/compare", file: "04-compare.png" },
  { name: "Historical Drill-Down", route: "/history/SE16", file: "05-historical-drilldown.png" },
  { name: "About", route: "/about", file: "06-about-data.png" },
  { name: "Quadrant", route: "/insights/quadrant", file: "07-quadrant.png" },
  { name: "Crime Map", route: "/insights/crime-map", file: "08-crime-map.png" },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  let failed = false;

  for (const pg of pages) {
    const page = await context.newPage();
    try {
      console.log(`📸 ${pg.name} (${pg.route})`);
      await page.goto(`${BASE_URL}${pg.route}`, { waitUntil: "networkidle", timeout: 30000 });
      await page.screenshot({ path: path.join(OUT_DIR, pg.file), fullPage: true });
      console.log(`  ✅ ${pg.file}`);
    } catch (err) {
      console.error(`  ❌ ${pg.file}: ${err instanceof Error ? err.message : err}`);
      failed = true;
    } finally {
      await page.close();
    }
  }

  // Analyse form fill + results screenshot
  try {
    console.log("📸 Property Analyser Results (form fill)");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/analyse`, { waitUntil: "networkidle", timeout: 30000 });

    // Fill form
    await page.fill('input[name="postcode"]', "SE16 7PB");
    // Select bedrooms = 2
    const bedroomsTrigger = page.locator('button[role="combobox"]').first();
    if (await bedroomsTrigger.isVisible()) {
      await bedroomsTrigger.click();
      await page.locator('[role="option"]').filter({ hasText: "2" }).first().click();
    }
    // Select property type = Flat
    const propTypeTrigger = page.locator('button[role="combobox"]').nth(1);
    if (await propTypeTrigger.isVisible()) {
      await propTypeTrigger.click();
      await page.locator('[role="option"]').filter({ hasText: "Flat" }).first().click();
    }
    await page.fill('input[name="askingPrice"]', "400000");
    await page.fill('input[name="expectedMonthlyRent"]', "1800");
    // Select first mortgage product
    const mortgageTrigger = page.locator('button[role="combobox"]').nth(2);
    if (await mortgageTrigger.isVisible()) {
      await mortgageTrigger.click();
      await page.locator('[role="option"]').first().click();
    }

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000); // Wait for results
    await page.screenshot({
      path: path.join(OUT_DIR, "03-property-analyser-results.png"),
      fullPage: true,
    });
    console.log("  ✅ 03-property-analyser-results.png");
    await page.close();
  } catch (err) {
    console.error(`  ❌ analyser results: ${err instanceof Error ? err.message : err}`);
    failed = true;
  }

  await browser.close();

  // Verify all files
  const expected = [...pages.map((p) => p.file), "03-property-analyser-results.png"];
  for (const f of expected) {
    const fp = path.join(OUT_DIR, f);
    if (!fs.existsSync(fp)) {
      console.error(`Missing: ${f}`);
      failed = true;
    } else {
      const stat = fs.statSync(fp);
      if (stat.size < 50 * 1024) {
        console.warn(`⚠️  ${f} is only ${Math.round(stat.size / 1024)}KB (expected ≥50KB)`);
      }
    }
  }

  if (failed) {
    console.error("\n❌ Some screenshots failed");
    process.exit(1);
  }
  console.log("\n✅ All screenshots captured");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
