import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.resolve("evidence");

const expectedFiles: { file: string; minBytes?: number; checkWidth?: boolean }[] = [
  { file: "01-erd/yieldlens-erd-uml.dbml", minBytes: 500 },
  { file: "02-schema-ddl/schema-full.sql", minBytes: 5000 },
  { file: "02-schema-ddl/advanced-features.sql", minBytes: 1500 },
  { file: "03-data-sources/source-catalogue.md", minBytes: 200 },
  { file: "04-data-quality/dama-assessment.md", minBytes: 200 },
  { file: "04-data-quality/quality-check-results.json", minBytes: 100 },
  { file: "05-sql-queries/q1-comparables.sql", minBytes: 200 },
  { file: "05-sql-queries/q1-comparables-explain.txt", minBytes: 500 },
  { file: "05-sql-queries/q2-historical-drilldown.sql", minBytes: 200 },
  { file: "05-sql-queries/q2-historical-drilldown-explain.txt", minBytes: 500 },
  { file: "05-sql-queries/q3-composite-score.sql", minBytes: 200 },
  { file: "05-sql-queries/q3-composite-score-explain.txt", minBytes: 500 },
  { file: "05-sql-queries/q4-quadrant.sql", minBytes: 200 },
  { file: "05-sql-queries/q4-quadrant-explain.txt", minBytes: 500 },
  { file: "06-dashboard/01-landing.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/03-property-analyser.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/03-property-analyser-results.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/04-compare.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/05-historical-drilldown.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/06-about-data.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/07-quadrant.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/08-crime-map.png", minBytes: 50000, checkWidth: true },
  { file: "06-dashboard/axe-audit.json", minBytes: 100 },
  { file: "06-dashboard/lighthouse-desktop.json", minBytes: 1000 },
  { file: "06-dashboard/performance-benchmarks.md", minBytes: 200 },
  { file: "06-dashboard/loom-script.md", minBytes: 1500 },
  { file: "07-migrations-demo/expand-contract-example.md", minBytes: 500 },
  { file: "09-README.md", minBytes: 500 },
  { file: "HUMAN_TODO.md", minBytes: 100 },
];

async function main() {
  let failed = 0;
  let passed = 0;

  for (const entry of expectedFiles) {
    const fp = path.join(ROOT, entry.file);
    if (!fs.existsSync(fp)) {
      console.error(`❌ MISSING: ${entry.file}`);
      failed++;
      continue;
    }

    const stat = fs.statSync(fp);
    if (entry.minBytes && stat.size < entry.minBytes) {
      console.error(`❌ TOO SMALL: ${entry.file} (${stat.size} bytes, need ≥${entry.minBytes})`);
      failed++;
      continue;
    }

    if (entry.checkWidth) {
      try {
        const meta = await sharp(fp).metadata();
        if (!meta.width || meta.width < 1920) {
          console.error(`❌ WIDTH: ${entry.file} (${meta.width}px, need ≥1920)`);
          failed++;
          continue;
        }
      } catch {
        console.error(`❌ UNREADABLE PNG: ${entry.file}`);
        failed++;
        continue;
      }
    }

    console.log(`✅ ${entry.file} (${Math.round(stat.size / 1024)}KB)`);
    passed++;
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${expectedFiles.length}`);
  if (failed > 0) {
    process.exit(1);
  }
  console.log("✅ All evidence files verified");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
