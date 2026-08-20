import { describe, expect, it } from "vitest";

import {
  currencyFractionDigits,
  dateInTimeZone,
  formatMoney,
  parseMoneyToMinor,
  suggestCategoryCode,
  validateIntakeDate,
} from "./inventory-domain";

describe("category code suggestions", () => {
  it("uses initials for multiword names and three characters for one word", () => {
    expect(suggestCategoryCode("Mens Casual Shirts")).toBe("MCS");
    expect(suggestCategoryCode("Shoes")).toBe("SHO");
  });

  it("requires manual entry when a name has no Latin letters or digits", () => {
    expect(suggestCategoryCode("!!!")).toBe("");
  });
});

describe("money conversion", () => {
  it("stores BDT using integer minor units", () => {
    expect(currencyFractionDigits("BDT")).toBe(2);
    expect(parseMoneyToMinor("300", "BDT")).toBe(30000);
    expect(parseMoneyToMinor("300.50", "BDT")).toBe(30050);
    expect(formatMoney(30050, "BDT")).toContain("300.50");
  });

  it("rejects excess precision and non-positive values", () => {
    expect(() => parseMoneyToMinor("1.001", "BDT")).toThrow();
    expect(() => parseMoneyToMinor("0", "BDT")).toThrow();
  });
});

describe("intake dates", () => {
  it("uses the shop timezone and validates real, nonfuture dates", () => {
    expect(dateInTimeZone(new Date("2026-08-19T18:30:00.000Z"), "Asia/Dhaka")).toBe(
      "2026-08-20",
    );
    expect(() => validateIntakeDate("2026-02-30", "2026-08-20")).toThrow();
    expect(() => validateIntakeDate("2026-08-21", "2026-08-20")).toThrow();
    expect(validateIntakeDate("2026-08-20", "2026-08-20")).toBeUndefined();
  });
});
