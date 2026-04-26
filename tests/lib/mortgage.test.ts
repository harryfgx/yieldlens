import { describe, it, expect } from "vitest";
import { calculateMonthlyPayment } from "~/lib/mortgage";

describe("calculateMonthlyPayment", () => {
  it("300000/5.5/25/REPAYMENT returns between 1841-1843", () => {
    const result = calculateMonthlyPayment(300000, 5.5, 25, "REPAYMENT");
    expect(result).toBeGreaterThanOrEqual(1841);
    expect(result).toBeLessThanOrEqual(1843);
  });

  it("300000/5.5/25/INTEREST_ONLY returns exactly 1375", () => {
    const result = calculateMonthlyPayment(300000, 5.5, 25, "INTEREST_ONLY");
    expect(result).toBe(1375);
  });

  it("300000/0/25/REPAYMENT returns exactly 1000", () => {
    const result = calculateMonthlyPayment(300000, 0, 25, "REPAYMENT");
    expect(result).toBe(1000);
  });

  it("0/5.5/25/REPAYMENT returns exactly 0", () => {
    const result = calculateMonthlyPayment(0, 5.5, 25, "REPAYMENT");
    expect(result).toBe(0);
  });

  it("500000/4.25/30/REPAYMENT returns between 2459-2461", () => {
    const result = calculateMonthlyPayment(500000, 4.25, 30, "REPAYMENT");
    expect(result).toBeGreaterThanOrEqual(2459);
    expect(result).toBeLessThanOrEqual(2461);
  });
});
