# Reference Verification

Automated tooling to verify Harvard-format references in `docs/references.md` against real sources.

## Usage

1. Populate `docs/references.md` with Harvard-format references (one per line)
2. Run verification:
   ```bash
   pnpm verify:references
   ```
3. Fix any flagged references — the script outputs which references failed and why
4. Re-run until all pass

## How It Works

### verify-references.ts

Parses each reference line and classifies it as book, journal, or web:

- **Books** (ISBN detected): queries Google Books API `volumes?q=isbn:<ISBN>` and checks the returned title matches
- **Books** (no ISBN, has author+title): queries `volumes?q=intitle:<title>+inauthor:<author>`
- **Journal articles** (DOI detected): queries CrossRef API `works/<DOI>` and verifies the DOI resolves
- **Web sources** (URL detected): performs HTTP HEAD request to verify the URL is reachable

Results are written to `evidence/10-references/verification-report.json` with fields:
- `reference` — the raw reference text
- `verification_url` — the API/URL used for verification
- `verified` — boolean pass/fail
- `evidence_snippet` — what was found (title, authors, HTTP status)

Exit code 0 only if all references verify successfully. If `docs/references.md` is still a skeleton (no reference entries), exits 0 with an informational message.

### check-citations.ts

Scans all `docs/*.md` files for common academic author surnames (Codd, Chen, Porter, Elmasri, Beaulieu, Loshin, etc.) and verifies each cited author also appears in `docs/references.md`. Catches missing references.

```bash
pnpm tsx scripts/check-citations.ts
```

## CI Integration

The `verify:references` script runs as part of the CI pipeline. Any push that breaks reference consistency will fail the build.
