import QRCode from "qrcode";

export const A4_LABELS_PER_PAGE = 36;
export const MAX_LABEL_JOB_SIZE = 1000;
export const QR_QUIET_ZONE = 4;

export type LabelFormat = "a4" | "thermal";
export type LabelUnit = {
  qrPayload: string;
  sku: string;
  unitNumber: number;
};
export type QrMatrix = {
  moduleCount: number;
  modules: readonly boolean[];
  quietZone: number;
  totalSize: number;
};

export function sortLabelUnits<T extends LabelUnit>(units: readonly T[]) {
  return [...units].sort(
    (left, right) => left.unitNumber - right.unitNumber,
  );
}

export function parseLabelRange(startValue: string, endValue: string, quantity: number) {
  if (!/^\d+$/.test(startValue) || !/^\d+$/.test(endValue)) {
    throw new Error("Start and end units must be whole numbers.");
  }

  const startUnit = Number(startValue);
  const endUnit = Number(endValue);
  if (!Number.isSafeInteger(startUnit) || !Number.isSafeInteger(endUnit)) {
    throw new Error("Start and end units must be whole numbers.");
  }
  if (startUnit < 1 || endUnit > quantity) {
    throw new Error(`Choose units between 1 and ${quantity}.`);
  }
  if (startUnit > endUnit) {
    throw new Error("Start unit cannot be after end unit.");
  }

  return {
    count: endUnit - startUnit + 1,
    endUnit,
    startUnit,
  };
}

export function expandLabelCopies<T extends LabelUnit>(
  units: readonly T[],
  copies: 1 | 2,
): T[] {
  if (copies !== 1 && copies !== 2) {
    throw new Error("Choose one or two copies per SKU.");
  }

  const total = units.length * copies;
  if (total > MAX_LABEL_JOB_SIZE) {
    throw new Error(`A label job cannot exceed ${MAX_LABEL_JOB_SIZE} labels.`);
  }

  return units.flatMap((unit) => Array.from({ length: copies }, () => unit));
}

export function labelPageCount(format: LabelFormat, totalLabels: number) {
  if (!Number.isSafeInteger(totalLabels) || totalLabels < 0) {
    throw new Error("Label total must be a non-negative whole number.");
  }

  return format === "a4"
    ? Math.ceil(totalLabels / A4_LABELS_PER_PAGE)
    : totalLabels;
}

export function createQrMatrix(payload: string): QrMatrix {
  if (!payload) {
    throw new Error("A QR payload is required.");
  }

  const symbol = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const moduleCount = symbol.modules.size;
  const modules = Array.from(
    { length: moduleCount * moduleCount },
    (_, index) => symbol.modules.get(Math.floor(index / moduleCount), index % moduleCount) === 1,
  );

  return {
    moduleCount,
    modules,
    quietZone: QR_QUIET_ZONE,
    totalSize: moduleCount + QR_QUIET_ZONE * 2,
  };
}

export function qrMatrixPath(matrix: QrMatrix) {
  const commands: string[] = [];

  for (let row = 0; row < matrix.moduleCount; row += 1) {
    let column = 0;
    while (column < matrix.moduleCount) {
      if (!matrix.modules[row * matrix.moduleCount + column]) {
        column += 1;
        continue;
      }

      const start = column;
      while (
        column < matrix.moduleCount &&
        matrix.modules[row * matrix.moduleCount + column]
      ) {
        column += 1;
      }
      const x = start + matrix.quietZone;
      const y = row + matrix.quietZone;
      commands.push(`M${x} ${y}h${column - start}v1h-${column - start}z`);
    }
  }

  return commands.join("");
}
