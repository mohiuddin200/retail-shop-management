export const returnReasons = [
  "changed_mind",
  "size_or_fit",
  "wrong_item",
  "defective_or_damaged",
  "other",
] as const;

export type ReturnCondition = "damaged" | "resalable";
export type ReturnReason = (typeof returnReasons)[number];

export const returnReasonLabels: Record<ReturnReason, string> = {
  changed_mind: "Changed mind",
  defective_or_damaged: "Defective or damaged",
  other: "Other",
  size_or_fit: "Size or fit",
  wrong_item: "Wrong item",
};

export function assertCanSwitchPosMode(cartItemCount: number) {
  if (cartItemCount > 0) {
    throw new Error("Clear the sale cart before switching to Return mode.");
  }
}

export function validateReturnDetails(reason: ReturnReason, note: string) {
  const trimmedNote = note.trim();
  if (trimmedNote.length > 500) {
    throw new Error("Return notes must be 500 characters or fewer.");
  }
  if (reason === "other" && !trimmedNote) {
    throw new Error("Describe the return reason when Other is selected.");
  }

  return {
    ...(trimmedNote ? { note: trimmedNote } : {}),
    reason,
  };
}

export function calculateReturnAdjustedTotals(values: {
  cashCollectedMinor: number;
  cashRefundedMinor: number;
  costRecoveredMinor: number;
  grossProfitMinor: number;
  grossSalesMinor: number;
}) {
  return {
    adjustedGrossProfitMinor:
      values.grossProfitMinor -
      values.cashRefundedMinor +
      values.costRecoveredMinor,
    netCashMinor: values.cashCollectedMinor - values.cashRefundedMinor,
    netSalesMinor: values.grossSalesMinor - values.cashRefundedMinor,
  };
}
