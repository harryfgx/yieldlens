import { describe, it, expect } from "vitest";
import { validateRow } from "../../scripts/ingest/land-registry.js";

const londonPostcodes = new Set(["SE16 7PB", "E1 6AN", "SW1A 1AA"]);

describe("land-registry validateRow", () => {
  it("accepts a valid row", () => {
    const row = { postcode: "SE16 7PB", sale_price: "350000", sale_date: "2024-01-15" };
    expect(validateRow(row, londonPostcodes)).toEqual({ valid: true });
  });

  it("rejects sale_price = 0 with reason invalid_price", () => {
    const row = { postcode: "SE16 7PB", sale_price: "0", sale_date: "2024-01-15" };
    expect(validateRow(row, londonPostcodes)).toEqual({ valid: false, reason: "invalid_price" });
  });

  it("rejects sale_price >= 100M with reason invalid_price", () => {
    const row = { postcode: "SE16 7PB", sale_price: "200000000", sale_date: "2024-01-15" };
    expect(validateRow(row, londonPostcodes)).toEqual({ valid: false, reason: "invalid_price" });
  });

  it("rejects future sale_date with reason future_date", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const row = { postcode: "SE16 7PB", sale_price: "350000", sale_date: futureDate.toISOString().split("T")[0]! };
    expect(validateRow(row, londonPostcodes)).toEqual({ valid: false, reason: "future_date" });
  });

  it("rejects null postcode with reason null_postcode", () => {
    const row = { postcode: "", sale_price: "350000", sale_date: "2024-01-15" };
    expect(validateRow(row, londonPostcodes)).toEqual({ valid: false, reason: "null_postcode" });
  });

  it("rejects non-London postcode with reason not_london", () => {
    const row = { postcode: "M1 1AA", sale_price: "350000", sale_date: "2024-01-15" };
    expect(validateRow(row, londonPostcodes)).toEqual({ valid: false, reason: "not_london" });
  });
});
