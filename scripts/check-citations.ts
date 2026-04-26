import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Common academic author surnames that may be cited in docs */
const KNOWN_AUTHORS = [
  "Codd", "Chen", "Porter", "Elmasri", "Beaulieu", "Laplante",
  "Vlasceanu", "Loshin", "Knaflic", "Wexler", "Vergadia", "Rosen", "Fernando",
];

/** Files that document the tool itself — not assessed report content */
const EXCLUDED_FILES = ["reference-verification.md", "AGENTS.md"];

function main() {
  const docsDir = join(dirname(__dirname), "docs");
  const refsPath = join(docsDir, "references.md");
  const refsContent = readFileSync(refsPath, "utf-8");

  // Check if references.md is still skeleton (no actual entries)
  const refsLines = refsContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("<!--"));

  if (refsLines.length === 0) {
    console.log("No references populated yet — citation check skipped (populate docs/references.md first).");
    process.exit(0);
  }

  const refsLower = refsContent.toLowerCase();

  // Collect report doc files (exclude tool docs and references.md itself)
  const docFiles = readdirSync(docsDir)
    .filter((f) => f.endsWith(".md") && f !== "references.md" && !EXCLUDED_FILES.includes(f));

  const issues: string[] = [];

  for (const file of docFiles) {
    const content = readFileSync(join(docsDir, file), "utf-8");
    for (const author of KNOWN_AUTHORS) {
      const regex = new RegExp(`\\b${author}\\b`, "i");
      if (regex.test(content)) {
        if (!refsLower.includes(author.toLowerCase())) {
          issues.push(`docs/${file} cites "${author}" but no matching entry in docs/references.md`);
        }
      }
    }
  }

  if (issues.length > 0) {
    console.error("Citation consistency issues found:");
    for (const issue of issues) {
      console.error(`  ✗ ${issue}`);
    }
    process.exit(1);
  }

  console.log(`Citation check passed — ${docFiles.length} files scanned for ${KNOWN_AUTHORS.length} known authors.`);
  process.exit(0);
}

main();
