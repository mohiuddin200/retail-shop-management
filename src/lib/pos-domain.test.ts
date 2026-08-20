import { describe, expect, it } from "vitest";

import {
  addPosCartItem,
  calculateCashCheckout,
  calculateSaleTotal,
  parsePosInput,
  type PosCartItem,
} from "./pos-domain";

describe("POS product input", () => {
  it("accepts stored QR payloads and raw SKUs but rejects unrelated text", () => {
    expect(parsePosInput("RSM:1:SKU:SHT-20260820-0001-001")).toBe(
      "SHT-20260820-0001-001",
    );
    expect(parsePosInput(" sht-20260820-0001-002 ")).toBe(
      "SHT-20260820-0001-002",
    );
    expect(() => parsePosInput("https://example.com/item/1")).toThrow(
      "Scan a Retail Shop Manager QR code or enter a valid SKU.",
    );
  });
});

describe("cash checkout", () => {
  it("shows the cart total before cash is entered", () => {
    expect(calculateSaleTotal(["350.50", "200"], "BDT")).toEqual({
      sellingPricesMinor: [35050, 20000],
      totalMinor: 55050,
    });
  });

  it("calculates integer totals and change and rejects underpayment", () => {
    expect(
      calculateCashCheckout(["350.50", "200"], "600", "BDT"),
    ).toEqual({
      cashTenderedMinor: 60000,
      changeMinor: 4950,
      sellingPricesMinor: [35050, 20000],
      totalMinor: 55050,
    });

    expect(() =>
      calculateCashCheckout(["350.50", "200"], "500", "BDT"),
    ).toThrow("Cash received cannot be less than the sale total.");
  });
});

describe("POS cart", () => {
  it("prevents duplicate units and limits one sale to 50 units", () => {
    const item = {
      categoryCode: "SHT",
      categoryName: "Shirts",
      sellingPrice: "",
      sku: "SHT-20260820-0001-001",
      unitId: "unit-1",
    } satisfies PosCartItem;

    const cart = addPosCartItem([], item);
    expect(cart).toEqual([item]);
    expect(() => addPosCartItem(cart, item)).toThrow(
      "This product is already in the cart.",
    );

    const fullCart = Array.from({ length: 50 }, (_, index) => ({
      ...item,
      sku: `SHT-20260820-0001-${String(index + 1).padStart(3, "0")}`,
      unitId: `unit-${index + 1}`,
    }));
    expect(() => addPosCartItem(fullCart, { ...item, unitId: "unit-51" })).toThrow(
      "A sale cannot contain more than 50 products.",
    );
  });
});
