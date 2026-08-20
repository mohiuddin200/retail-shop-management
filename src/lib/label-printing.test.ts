import { describe, expect, it } from "vitest";

import {
  A4_LABELS_PER_PAGE,
  MAX_LABEL_JOB_SIZE,
  QR_QUIET_ZONE,
  createQrMatrix,
  expandLabelCopies,
  labelPageCount,
  parseLabelRange,
  qrMatrixPath,
  sortLabelUnits,
  type LabelUnit,
} from "./label-printing";

const units: LabelUnit[] = [
  { qrPayload: "RSM:1:SKU:SHT-010", sku: "SHT-010", unitNumber: 10 },
  { qrPayload: "RSM:1:SKU:SHT-002", sku: "SHT-002", unitNumber: 2 },
  { qrPayload: "RSM:1:SKU:SHT-001", sku: "SHT-001", unitNumber: 1 },
];

describe("label job ranges", () => {
  it("accepts an inclusive contiguous range", () => {
    expect(parseLabelRange("2", "4", 5)).toEqual({
      count: 3,
      endUnit: 4,
      startUnit: 2,
    });
  });

  it.each([
    ["", "2"],
    ["1.5", "2"],
    ["4", "3"],
    ["0", "2"],
    ["1", "6"],
  ])("rejects invalid range %s-%s", (start, end) => {
    expect(() => parseLabelRange(start, end, 5)).toThrow();
  });
});

describe("label job expansion and pagination", () => {
  it("orders units numerically rather than lexically", () => {
    expect(sortLabelUnits(units).map((unit) => unit.unitNumber)).toEqual([1, 2, 10]);
  });

  it("places two copies of each SKU consecutively and preserves each payload", () => {
    const expanded = expandLabelCopies(sortLabelUnits(units), 2);
    expect(expanded.map((unit) => unit.unitNumber)).toEqual([1, 1, 2, 2, 10, 10]);
    expect(expanded[0].qrPayload).toBe("RSM:1:SKU:SHT-001");
    expect(expanded[1].qrPayload).toBe(expanded[0].qrPayload);
  });

  it("calculates A4 and thermal page counts", () => {
    expect(labelPageCount("a4", A4_LABELS_PER_PAGE)).toBe(1);
    expect(labelPageCount("a4", A4_LABELS_PER_PAGE + 1)).toBe(2);
    expect(labelPageCount("thermal", 72)).toBe(72);
  });

  it("rejects oversized jobs", () => {
    const oversized = Array.from({ length: MAX_LABEL_JOB_SIZE / 2 + 1 }, (_, index) => ({
      qrPayload: `RSM:1:SKU:${index}`,
      sku: String(index),
      unitNumber: index + 1,
    }));
    expect(() => expandLabelCopies(oversized, 2)).toThrow(/cannot exceed/);
  });
});

describe("QR matrix generation", () => {
  it("is deterministic, uses level M data, and includes a four-module quiet zone", () => {
    const first = createQrMatrix("RSM:1:SKU:SHT-20260820-0001-001");
    const second = createQrMatrix("RSM:1:SKU:SHT-20260820-0001-001");

    expect(first).toEqual(second);
    expect(first.quietZone).toBe(QR_QUIET_ZONE);
    expect(first.totalSize).toBe(first.moduleCount + 8);
    expect(qrMatrixPath(first)).toBe(qrMatrixPath(second));
  });

  it("preserves payload differences in the encoded matrix", () => {
    const first = createQrMatrix("RSM:1:SKU:SHT-20260820-0001-001");
    const last = createQrMatrix("RSM:1:SKU:SHT-20260820-0001-500");

    expect(first.modules).not.toEqual(last.modules);
  });
});
