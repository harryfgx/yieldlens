import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ReferenceEntry {
  raw: string;
  type: "book" | "journal" | "web" | "unknown";
  author?: string;
  title?: string;
  year?: string;
  isbn?: string;
  doi?: string;
  url?: string;
}

interface VerificationResult {
  reference: string;
  verification_url: string;
  verified: boolean;
  evidence_snippet: string;
}

function parseReferences(content: string): ReferenceEntry[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("<!--"));

  return lines.map((raw) => {
    const entry: ReferenceEntry = { raw, type: "unknown" };

    // Extract ISBN
    const isbnMatch = raw.match(/ISBN[:\s]*([0-9-Xx]{10,17})/i);
    if (isbnMatch?.[1]) {
      entry.isbn = isbnMatch[1].replace(/-/g, "");
      entry.type = "book";
    }

    // Extract DOI
    const doiMatch = raw.match(/doi[:\s]*(10\.\d{4,}\/[^\s,)]+)/i) ??
      raw.match(/(10\.\d{4,}\/[^\s,)]+)/);
    if (doiMatch?.[1]) {
      entry.doi = doiMatch[1];
      entry.type = "journal";
    }

    // Extract URL
    const urlMatch = raw.match(/(https?:\/\/[^\s)]+)/);
    if (urlMatch?.[1]) {
      entry.url = urlMatch[1].replace(/[.,;]+$/, "");
      if (entry.type === "unknown") entry.type = "web";
    }

    // Extract author (Harvard: Author, A.B. or Author, A.)
    const authorMatch = raw.match(/^([A-Z][a-zA-Z'-]+(?:,\s*[A-Z]\.?(?:\s*[A-Z]\.?)*)?)/);
    if (authorMatch?.[1]) entry.author = authorMatch[1];

    // Extract year
    const yearMatch = raw.match(/\((\d{4})\)/);
    if (yearMatch?.[1]) entry.year = yearMatch[1];

    // Extract title (text between year and next period/publisher)
    const titleMatch = raw.match(/\(\d{4}\)\s*['"]?([^.'"]+)/);
    if (titleMatch?.[1]) entry.title = titleMatch[1].trim().replace(/['"]+$/, "");

    return entry;
  });
}

async function verifyBook(entry: ReferenceEntry): Promise<VerificationResult> {
  const base = "https://www.googleapis.com/books/v1/volumes?q=";
  let url: string;

  if (entry.isbn) {
    url = `${base}isbn:${entry.isbn}`;
  } else if (entry.title && entry.author) {
    const authorSurname = entry.author.split(",")[0] ?? "";
    url = `${base}intitle:${encodeURIComponent(entry.title)}+inauthor:${encodeURIComponent(authorSurname)}`;
  } else {
    return { reference: entry.raw, verification_url: "", verified: false, evidence_snippet: "Insufficient metadata to verify" };
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return { reference: entry.raw, verification_url: url, verified: false, evidence_snippet: `HTTP ${res.status}` };
    const data = (await res.json()) as { totalItems?: number; items?: Array<{ volumeInfo?: { title?: string; authors?: string[] } }> };
    if (!data.totalItems || data.totalItems === 0) {
      return { reference: entry.raw, verification_url: url, verified: false, evidence_snippet: "No results found" };
    }
    const vol = data.items?.[0]?.volumeInfo;
    const snippet = `${vol?.title ?? "?"} by ${vol?.authors?.join(", ") ?? "?"}`;
    const titleLower = (entry.title ?? "").toLowerCase();
    const foundTitle = (vol?.title ?? "").toLowerCase();
    const verified = foundTitle.includes(titleLower.slice(0, 20)) || titleLower.includes(foundTitle.slice(0, 20));
    return { reference: entry.raw, verification_url: url, verified, evidence_snippet: snippet };
  } catch (e) {
    return { reference: entry.raw, verification_url: url, verified: false, evidence_snippet: `Error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function verifyJournal(entry: ReferenceEntry): Promise<VerificationResult> {
  if (!entry.doi) {
    return { reference: entry.raw, verification_url: "", verified: false, evidence_snippet: "No DOI found" };
  }
  const url = `https://api.crossref.org/works/${encodeURIComponent(entry.doi)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "YieldLens/1.0 (mailto:harryfgoatcher@gmail.com)" } });
    if (!res.ok) return { reference: entry.raw, verification_url: url, verified: false, evidence_snippet: `HTTP ${res.status}` };
    const data = (await res.json()) as { message?: { title?: string[]; author?: Array<{ family?: string }> } };
    const title = data.message?.title?.[0] ?? "";
    const authors = data.message?.author?.map((a) => a.family).join(", ") ?? "";
    return { reference: entry.raw, verification_url: url, verified: true, evidence_snippet: `${title} by ${authors}` };
  } catch (e) {
    return { reference: entry.raw, verification_url: url, verified: false, evidence_snippet: `Error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function verifyWeb(entry: ReferenceEntry): Promise<VerificationResult> {
  if (!entry.url) {
    return { reference: entry.raw, verification_url: "", verified: false, evidence_snippet: "No URL found" };
  }
  try {
    const res = await fetch(entry.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(10000) });
    const verified = res.ok || res.status === 301 || res.status === 302;
    return { reference: entry.raw, verification_url: entry.url, verified, evidence_snippet: `HTTP ${res.status}` };
  } catch {
    // HEAD may be blocked; try GET
    try {
      const res = await fetch(entry.url, { redirect: "follow", signal: AbortSignal.timeout(10000) });
      return { reference: entry.raw, verification_url: entry.url, verified: res.ok, evidence_snippet: `HTTP ${res.status}` };
    } catch (e) {
      return { reference: entry.raw, verification_url: entry.url, verified: false, evidence_snippet: `Error: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}

async function verifyEntry(entry: ReferenceEntry): Promise<VerificationResult> {
  switch (entry.type) {
    case "book": return verifyBook(entry);
    case "journal": return verifyJournal(entry);
    case "web": return verifyWeb(entry);
    default:
      // Try book first (most common in academic references)
      if (entry.title && entry.author) return verifyBook(entry);
      if (entry.url) return verifyWeb(entry);
      return { reference: entry.raw, verification_url: "", verified: false, evidence_snippet: "Could not determine reference type" };
  }
}

async function main() {
  const refsPath = resolve(__dirname, "../docs/references.md");
  const content = readFileSync(refsPath, "utf-8");
  const entries = parseReferences(content);

  if (entries.length === 0) {
    console.log("No references to verify yet — populate docs/references.md");
    const outDir = resolve(__dirname, "../evidence/10-references");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "verification-report.json"), JSON.stringify([], null, 2));
    process.exit(0);
  }

  console.log(`Verifying ${entries.length} references...`);
  const results: VerificationResult[] = [];

  for (const entry of entries) {
    const result = await verifyEntry(entry);
    console.log(`${result.verified ? "✓" : "✗"} ${entry.raw.slice(0, 80)}...`);
    results.push(result);
  }

  const outDir = resolve(__dirname, "../evidence/10-references");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "verification-report.json"), JSON.stringify(results, null, 2));

  const failed = results.filter((r) => !r.verified);
  if (failed.length > 0) {
    console.error(`\n${failed.length} reference(s) failed verification:`);
    for (const f of failed) {
      console.error(`  ✗ ${f.reference.slice(0, 100)}`);
      console.error(`    Reason: ${f.evidence_snippet}`);
    }
    process.exit(1);
  }

  console.log(`\nAll ${results.length} references verified successfully.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
