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

export const A4_PAGE_CSS = `
@page {
  size: 210mm 297mm;
  margin: 13.5mm 9mm;
}
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.sheet {
  display: grid;
  grid-template-columns: repeat(4, 48mm);
  grid-template-rows: repeat(9, 30mm);
  width: 192mm;
  height: 270mm;
  break-after: page;
  page-break-after: always;
}
.sheet:last-child {
  break-after: auto;
  page-break-after: auto;
}
.label {
  align-items: center;
  background: #ffffff;
  border: 0.15mm dashed #000000;
  box-sizing: border-box;
  display: flex;
  gap: 2mm;
  height: 30mm;
  overflow: hidden;
  padding: 2mm;
  width: 48mm;
}
.qr {
  flex: 0 0 24mm;
  height: 24mm;
  width: 24mm;
}
.qr svg {
  display: block;
  height: 100%;
  shape-rendering: crispEdges;
  width: 100%;
}
.copy {
  flex: 1;
  min-width: 0;
}
.category {
  font-size: 11pt;
  font-weight: 700;
  line-height: 1.05;
  margin-bottom: 1.5mm;
}
.sku {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 7pt;
  font-weight: 700;
  line-height: 1.15;
  overflow-wrap: anywhere;
  word-break: break-word;
}
`;

export const THERMAL_PAGE_CSS = `
@page {
  size: 40mm 30mm;
  margin: 0;
}
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.thermal-label {
  align-items: center;
  background: #ffffff;
  box-sizing: border-box;
  display: flex;
  gap: 1.5mm;
  height: 30mm;
  overflow: hidden;
  padding: 1mm;
  width: 40mm;
  break-after: page;
  page-break-after: always;
}
.thermal-label:last-child {
  break-after: auto;
  page-break-after: auto;
}
.qr {
  flex: 0 0 22mm;
  height: 22mm;
  width: 22mm;
}
.qr svg {
  display: block;
  height: 100%;
  shape-rendering: crispEdges;
  width: 100%;
}
.copy {
  flex: 1;
  min-width: 0;
}
.category {
  font-size: 10pt;
  font-weight: 700;
  line-height: 1.05;
  margin-bottom: 1.5mm;
}
.sku {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 6.5pt;
  font-weight: 700;
  line-height: 1.1;
  overflow-wrap: anywhere;
  word-break: break-word;
}
`;

export type LabelHtmlOptions = {
  categoryCode: string;
  documentTitle: string;
  labels: readonly LabelUnit[];
  onProgress?: (completed: number, total: number) => void;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function qrMatrixToInlineSvg(matrix: QrMatrix, accessibleLabel: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrix.totalSize} ${matrix.totalSize}" role="img" aria-label="${escapeHtml(accessibleLabel)}"><rect width="${matrix.totalSize}" height="${matrix.totalSize}" fill="#ffffff"/><path d="${qrMatrixPath(matrix)}" fill="#000000"/></svg>`;
}

export async function buildA4LabelHtml({
  categoryCode,
  documentTitle,
  labels,
  onProgress,
}: LabelHtmlOptions) {
  if (labels.length === 0) {
    throw new Error("Select at least one label.");
  }
  if (labels.length > MAX_LABEL_JOB_SIZE) {
    throw new Error(`A label job cannot exceed ${MAX_LABEL_JOB_SIZE} labels.`);
  }

  const renderedLabels: string[] = [];
  const chunkSize = 25;
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const matrix = createQrMatrix(label.qrPayload);
    renderedLabels.push(
      `<div class="label"><div class="qr">${qrMatrixToInlineSvg(matrix, `QR code containing ${label.qrPayload}`)}</div><div class="copy"><div class="category">${escapeHtml(categoryCode)}</div><div class="sku">${escapeHtml(label.sku)}</div></div></div>`,
    );
    onProgress?.(index + 1, labels.length);

    if ((index + 1) % chunkSize === 0 && index + 1 < labels.length) {
      await yieldToEventLoop();
    }
  }

  const sheets: string[] = [];
  for (let start = 0; start < renderedLabels.length; start += A4_LABELS_PER_PAGE) {
    const pageLabels = renderedLabels.slice(start, start + A4_LABELS_PER_PAGE);
    const blankCount = A4_LABELS_PER_PAGE - pageLabels.length;
    sheets.push(
      `<section class="sheet">${pageLabels.join("")}${'<div class="label" aria-hidden="true"></div>'.repeat(blankCount)}</section>`,
    );
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(documentTitle)}</title><style>${A4_PAGE_CSS}</style></head><body>${sheets.join("")}</body></html>`;
}

export async function buildLabelHtml(format: LabelFormat, options: LabelHtmlOptions) {
  return format === "a4"
    ? buildA4LabelHtml(options)
    : buildThermalLabelHtml(options);
}

export async function buildThermalLabelHtml({
  categoryCode,
  documentTitle,
  labels,
  onProgress,
}: LabelHtmlOptions) {
  if (labels.length === 0) {
    throw new Error("Select at least one label.");
  }
  if (labels.length > MAX_LABEL_JOB_SIZE) {
    throw new Error(`A label job cannot exceed ${MAX_LABEL_JOB_SIZE} labels.`);
  }

  const renderedLabels: string[] = [];
  const chunkSize = 25;
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    const matrix = createQrMatrix(label.qrPayload);
    renderedLabels.push(
      `<div class="thermal-label"><div class="qr">${qrMatrixToInlineSvg(matrix, `QR code containing ${label.qrPayload}`)}</div><div class="copy"><div class="category">${escapeHtml(categoryCode)}</div><div class="sku">${escapeHtml(label.sku)}</div></div></div>`,
    );
    onProgress?.(index + 1, labels.length);

    if ((index + 1) % chunkSize === 0 && index + 1 < labels.length) {
      await yieldToEventLoop();
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(documentTitle)}</title><style>${THERMAL_PAGE_CSS}</style></head><body>${renderedLabels.join("")}</body></html>`;
}

function yieldToEventLoop() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}
