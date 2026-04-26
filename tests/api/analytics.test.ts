import { describe, it, expect } from "vitest";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const skipDb = !process.env.DIRECT_URL;

describe.skipIf(skipDb)("analytics router", () => {
  async function createCaller() {
    const ctx = await createTRPCContext({ headers: new Headers() });
    return appRouter.createCaller(ctx);
  }

  it("comparables returns stats object for valid input", async () => {
    const caller = await createCaller();
    const result = await caller.analytics.comparables({
      postcode: "SE16 7PB",
      bedrooms: 2,
      propertyType: "FLAT",
      floorAreaSqm: 70,
    });
    expect(result).toHaveProperty("p25");
    expect(result).toHaveProperty("median");
    expect(result).toHaveProperty("p75");
    expect(result).toHaveProperty("median_gbp_per_sqft");
    expect(result).toHaveProperty("comparable_count");
    expect(typeof result.comparable_count).toBe("number");
  });

  it("comparables throws ZodError on invalid postcode", async () => {
    const caller = await createCaller();
    await expect(
      caller.analytics.comparables({
        postcode: "INVALID",
        bedrooms: 2,
        propertyType: "FLAT",
        floorAreaSqm: 70,
      }),
    ).rejects.toThrow();
  });

  it("historicalDrilldown returns 4 distinct geo_level values", async () => {
    const caller = await createCaller();
    const result = await caller.analytics.historicalDrilldown({ outcode: "SE16" });
    const levels = new Set(result.map((r) => r.geo_level));
    expect(levels.size).toBe(4);
    expect(levels).toContain("postcode_sector");
    expect(levels).toContain("outcode");
    expect(levels).toContain("area");
    expect(levels).toContain("region");
  }, 30000);

  it("compositeScore returns score 0-100 and valid verdict", async () => {
    const caller = await createCaller();
    const result = await caller.analytics.compositeScore({
      postcode: "SE16 7PB",
      bedrooms: 2,
      propertyType: "FLAT",
      askingPrice: 400000,
      expectedMonthlyRent: 1800,
      depositPct: 25,
      mortgageProductId: 1,
    });
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    expect(["CASH_COW", "GROWTH_PLAY", "UNICORN", "AVOID"]).toContain(result.verdict);
  }, 15000);

  it("quadrant returns array with valid quadrant values", async () => {
    const caller = await createCaller();
    const result = await caller.analytics.quadrant();
    expect(result.length).toBeGreaterThan(0);
    for (const row of result) {
      expect(["CASH_COW", "GROWTH_PLAY", "UNICORN", "AVOID"]).toContain(row.quadrant);
    }
  });

  it("compareSnapshot throws ZodError with 5 outcodes", async () => {
    const caller = await createCaller();
    await expect(
      caller.analytics.compareSnapshot({
        outcodes: ["SE16", "E1", "SW1", "N1", "W1"],
      }),
    ).rejects.toThrow();
  });
});
