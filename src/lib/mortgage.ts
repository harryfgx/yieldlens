/** Client-side mortgage payment calculator matching the PL/pgSQL function exactly. */
export function calculateMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number,
  mortgageType: "REPAYMENT" | "INTEREST_ONLY",
): number {
  if (principal === 0) return 0;

  if (mortgageType === "INTEREST_ONLY") {
    return principal * annualRatePct / 100 / 12;
  }

  // REPAYMENT
  if (annualRatePct === 0) {
    return principal / (termYears * 12);
  }

  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}
