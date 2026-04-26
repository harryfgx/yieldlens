import { describe, it, expect, afterAll } from "vitest";
import postgres from "postgres";

const sql = postgres(process.env.DIRECT_URL!);

afterAll(() => sql.end());

describe("calculate_monthly_payment", () => {
  async function calc(
    principal: number,
    rate: number,
    years: number,
    type: string,
  ): Promise<number> {
    const [row] =
      await sql`SELECT calculate_monthly_payment(${principal}, ${rate}, ${years}, ${type}) AS result`;
    return Number(row!.result);
  }

  it("REPAYMENT 300k/5.5%/25yr returns ~1842", async () => {
    const result = await calc(300000, 5.5, 25, "REPAYMENT");
    expect(Math.abs(result - 1842)).toBeLessThanOrEqual(1);
  });

  it("INTEREST_ONLY 300k/5.5%/25yr returns exactly 1375", async () => {
    const result = await calc(300000, 5.5, 25, "INTEREST_ONLY");
    expect(result).toBe(1375);
  });

  it("REPAYMENT 300k/0%/25yr returns exactly 1000", async () => {
    const result = await calc(300000, 0, 25, "REPAYMENT");
    expect(result).toBe(1000);
  });

  it("REPAYMENT 0/5.5%/25yr returns exactly 0", async () => {
    const result = await calc(0, 5.5, 25, "REPAYMENT");
    expect(result).toBe(0);
  });

  it("REPAYMENT 500k/4.25%/30yr returns ~2460", async () => {
    const result = await calc(500000, 4.25, 30, "REPAYMENT");
    expect(Math.abs(result - 2460)).toBeLessThanOrEqual(1);
  });
});
