import { currencyFractionDigits } from "./inventory-domain";

const skuPattern = /^[A-Z0-9]{2,4}-\d{8}-\d{4,}-\d{3,}$/;
const qrPrefix = "RSM:1:SKU:";

export type PosCartItem = {
  categoryCode: string;
  categoryName: string;
  sellingPrice: string;
  sku: string;
  unitId: string;
};

export function addPosCartItem(
  cart: readonly PosCartItem[],
  item: PosCartItem,
) {
  if (cart.some((existing) => existing.unitId === item.unitId)) {
    throw new Error("This product is already in the cart.");
  }
  if (cart.length >= 50) {
    throw new Error("A sale cannot contain more than 50 products.");
  }

  return [...cart, item];
}

export function parsePosInput(value: string) {
  const normalized = value.trim().toUpperCase();
  const sku = normalized.startsWith(qrPrefix)
    ? normalized.slice(qrPrefix.length)
    : normalized;

  if (!skuPattern.test(sku)) {
    throw new Error("Scan a Retail Shop Manager QR code or enter a valid SKU.");
  }

  return sku;
}

export function calculateCashCheckout(
  sellingPrices: readonly string[],
  cashTendered: string,
  currencyCode: string,
) {
  const { sellingPricesMinor, totalMinor } = calculateSaleTotal(
    sellingPrices,
    currencyCode,
  );
  const cashTenderedMinor = parsePositiveMoney(
    cashTendered,
    currencyCode,
    "cash amount",
  );

  if (!Number.isSafeInteger(totalMinor)) {
    throw new Error("The sale total is too large.");
  }
  if (cashTenderedMinor < totalMinor) {
    throw new Error("Cash received cannot be less than the sale total.");
  }

  return {
    cashTenderedMinor,
    changeMinor: cashTenderedMinor - totalMinor,
    sellingPricesMinor,
    totalMinor,
  };
}

export function calculateSaleTotal(
  sellingPrices: readonly string[],
  currencyCode: string,
) {
  if (sellingPrices.length === 0 || sellingPrices.length > 50) {
    throw new Error("A sale must contain between 1 and 50 products.");
  }

  const sellingPricesMinor = sellingPrices.map((value) =>
    parsePositiveMoney(value, currencyCode, "selling price"),
  );
  const totalMinor = sellingPricesMinor.reduce((total, price) => total + price, 0);
  if (!Number.isSafeInteger(totalMinor)) {
    throw new Error("The sale total is too large.");
  }

  return { sellingPricesMinor, totalMinor };
}

function parsePositiveMoney(value: string, currencyCode: string, label: string) {
  const normalized = value.trim().replaceAll(",", "");
  const fractionDigits = currencyFractionDigits(currencyCode);
  const match = normalized.match(/^(\d+)(?:\.(\d*))?$/);

  if (!match || (match[2]?.length ?? 0) > fractionDigits) {
    throw new Error(`Enter a valid positive ${label}.`);
  }

  const scale = 10 ** fractionDigits;
  const minor =
    Number(match[1]) * scale +
    Number((match[2] ?? "").padEnd(fractionDigits, "0") || "0");

  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new Error(`Enter a valid positive ${label}.`);
  }

  return minor;
}
