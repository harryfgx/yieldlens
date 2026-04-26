import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("run-all orchestration", () => {
  it("imports postcode-directory before land-registry in run-all.ts", () => {
    const source = readFileSync(join(process.cwd(), "scripts/ingest/run-all.ts"), "utf-8");
    const postcodeIdx = source.indexOf("ingestPostcodeDirectory");
    const lrIdx = source.indexOf("ingestLandRegistry");
    expect(postcodeIdx).toBeGreaterThan(-1);
    expect(lrIdx).toBeGreaterThan(-1);
    // postcode-directory must appear before land-registry in execution order
    expect(postcodeIdx).toBeLessThan(lrIdx);
  });

  it("calls refresh_postcode_metrics after all ingestion", () => {
    const source = readFileSync(join(process.cwd(), "scripts/ingest/run-all.ts"), "utf-8");
    const refreshIdx = source.indexOf("refresh_postcode_metrics");
    const lrIdx = source.indexOf("ingestLandRegistry");
    expect(refreshIdx).toBeGreaterThan(lrIdx);
  });
});
