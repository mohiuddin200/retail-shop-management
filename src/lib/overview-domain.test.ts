import { describe, expect, it } from "vitest";

import { buildOverviewSnapshot } from "./overview-domain";

describe("Overview snapshot", () => {
  it("projects current-day operations without exposing inventory cost to a cashier", () => {
    const snapshot = buildOverviewSnapshot({
      currentDay: {
        cashRefundedMinor: 1500,
        dayNumber: 4,
        grossSalesMinor: 72500,
        netCashMinor: 71000,
        returnCount: 1,
        saleCount: 6,
        unitCount: 8,
      },
      inventorySummary: {
        activeCategoryCount: 3,
        batchCount: 5,
        inStockCostMinor: 220000,
        inStockUnitCount: 18,
      },
      role: "cashier",
    });

    expect(snapshot.businessDay).toEqual({
      dayLabel: "Business day 4",
      grossSalesMinor: 72500,
      netCashMinor: 71000,
      refundAmountMinor: 1500,
      returnCount: 1,
      saleCount: 6,
      statusLabel: "Open",
      unitCount: 8,
    });
    expect(snapshot.inventory).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain("220000");
  });

  it("shows the first-transaction zero state and inventory snapshot to an owner", () => {
    expect(
      buildOverviewSnapshot({
        currentDay: null,
        inventorySummary: {
          activeCategoryCount: 2,
          batchCount: 3,
          inStockCostMinor: 185050,
          inStockUnitCount: 11,
        },
        role: "owner",
      }),
    ).toEqual({
      businessDay: {
        dayLabel: "First business day",
        grossSalesMinor: 0,
        netCashMinor: 0,
        refundAmountMinor: 0,
        returnCount: 0,
        saleCount: 0,
        statusLabel: "Not opened",
        unitCount: 0,
      },
      inventory: {
        activeCategoryCount: 2,
        batchCount: 3,
        inStockCostMinor: 185050,
        inStockUnitCount: 11,
      },
    });
  });
});
