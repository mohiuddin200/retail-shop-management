import { describe, expect, it } from "vitest";

import {
  assertCanSwitchPosMode,
  calculateReturnAdjustedTotals,
  validateReturnDetails,
} from "./return-domain";

describe("return details", () => {
  it("keeps a preset reason and trims an optional note", () => {
    expect(validateReturnDetails("size_or_fit", "  Customer needs a larger size.  ")).toEqual({
      note: "Customer needs a larger size.",
      reason: "size_or_fit",
    });
  });

  it("requires a note for other and rejects notes over 500 characters", () => {
    expect(() => validateReturnDetails("other", "   ")).toThrow(
      "Describe the return reason",
    );
    expect(() => validateReturnDetails("changed_mind", "x".repeat(501))).toThrow(
      "500 characters or fewer",
    );
  });
});

describe("POS mode switching", () => {
  it("requires the sale cart to be empty before entering Return mode", () => {
    expect(() => assertCanSwitchPosMode(2)).toThrow("Clear the sale cart");
    expect(() => assertCanSwitchPosMode(0)).not.toThrow();
  });
});

describe("return-adjusted business-day totals", () => {
  it("subtracts refunds and restores only resalable cost", () => {
    expect(
      calculateReturnAdjustedTotals({
        cashCollectedMinor: 65000,
        cashRefundedMinor: 40000,
        costRecoveredMinor: 30000,
        grossProfitMinor: 5000,
        grossSalesMinor: 65000,
      }),
    ).toEqual({
      adjustedGrossProfitMinor: -5000,
      netCashMinor: 25000,
      netSalesMinor: 25000,
    });
  });
});
