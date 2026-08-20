export type OverviewRole = "cashier" | "manager" | "owner";

export type OverviewBusinessDayInput = {
  cashRefundedMinor: number;
  dayNumber: number;
  grossSalesMinor: number;
  netCashMinor: number;
  returnCount: number;
  saleCount: number;
  unitCount: number;
};

export type OverviewInventoryInput = {
  activeCategoryCount: number;
  batchCount: number;
  inStockCostMinor: number;
  inStockUnitCount: number;
};

export function buildOverviewSnapshot({
  currentDay,
  inventorySummary,
  role,
}: {
  currentDay: OverviewBusinessDayInput | null;
  inventorySummary: OverviewInventoryInput | null;
  role: OverviewRole;
}) {
  const businessDay = currentDay
    ? {
        dayLabel: `Business day ${currentDay.dayNumber}`,
        grossSalesMinor: currentDay.grossSalesMinor,
        netCashMinor: currentDay.netCashMinor,
        refundAmountMinor: currentDay.cashRefundedMinor,
        returnCount: currentDay.returnCount,
        saleCount: currentDay.saleCount,
        statusLabel: "Open",
        unitCount: currentDay.unitCount,
      }
    : {
        dayLabel: "First business day",
        grossSalesMinor: 0,
        netCashMinor: 0,
        refundAmountMinor: 0,
        returnCount: 0,
        saleCount: 0,
        statusLabel: "Not opened",
        unitCount: 0,
      };

  return {
    businessDay,
    inventory: role === "cashier" ? null : inventorySummary,
  };
}
