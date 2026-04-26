import "dotenv/config";
import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.PRODUCTION_URL ?? "http://localhost:3000";
const OUT_FILE = path.resolve("evidence/06-dashboard/axe-audit.json");

const routes = [
  "/",
  "/analyse",
  "/compare",
  "/history/SE16",
  "/about",
  "/insights/quadrant",
  "/insights/crime-map",
];

interface Violation {
  id: string;
  impact: string | null;
  description: string;
  helpUrl: string;
  nodes: number;
}

interface PageResult {
  route: string;
  violations: Violation[];
  passes: number;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  const results: PageResult[] = [];
  let totalViolations = 0;

  for (const route of routes) {
    const page = await context.newPage();
    try {
      console.log(`🔍 Auditing ${route}`);
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 30000 });

      const axeResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const violations: Violation[] = axeResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
      }));

      results.push({ route, violations, passes: axeResults.passes.length });
      totalViolations += violations.length;

      if (violations.length > 0) {
        for (const v of violations) {
          console.log(`  ❌ ${v.id} (${v.impact}): ${v.description} [${v.nodes} nodes]`);
        }
      } else {
        console.log(`  ✅ No violations (${axeResults.passes.length} rules passed)`);
      }
    } catch (err) {
      console.error(`  ⚠️  Error on ${route}: ${err instanceof Error ? err.message : err}`);
      results.push({ route, violations: [], passes: 0 });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  fs.writeFileSync(OUT_FILE, JSON.stringify({ auditedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nReport: ${OUT_FILE}`);
  console.log(`Total violations: ${totalViolations}`);

  if (totalViolations > 0) {
    console.error("❌ Accessibility audit FAILED");
    process.exit(1);
  }
  console.log("✅ Accessibility audit PASSED — zero violations");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
