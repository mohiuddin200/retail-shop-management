/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

type ShopRole = "cashier" | "manager" | "owner";

async function seedPosShop(role: ShopRole = "cashier") {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {});
    const shopId = await ctx.db.insert("shops", {
      name: "Test Shop",
      currencyCode: "BDT",
      timezone: "Asia/Dhaka",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    const membershipId = await ctx.db.insert("memberships", {
      shopId,
      userId,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const categoryId = await ctx.db.insert("categories", {
      shopId,
      name: "Shirts",
      code: "SHT",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    const batchId = await ctx.db.insert("productBatches", {
      shopId,
      batchNumber: 1,
      buyingPriceMinor: 30000,
      categoryId,
      createdAt: now,
      createdBy: userId,
      intakeDate: "2026-08-20",
      quantity: 2,
      requestKey: "11111111-1111-4111-8111-111111111111",
    });
    const unitIds: Id<"inventoryUnits">[] = [];
    for (let unitNumber = 1; unitNumber <= 2; unitNumber += 1) {
      const sku = `SHT-20260820-0001-${String(unitNumber).padStart(3, "0")}`;
      unitIds.push(await ctx.db.insert("inventoryUnits", {
        shopId,
        batchId,
        buyingPriceMinor: 30000,
        categoryId,
        createdAt: now,
        createdBy: userId,
        qrPayload: `RSM:1:SKU:${sku}`,
        sku,
        status: "in_stock",
        updatedAt: now,
      }));
    }
    return { categoryId, membershipId, shopId, unitIds, userId };
  });

  return {
    ...seeded,
    client: t.withIdentity({ subject: seeded.userId }),
    t,
  };
}

describe("POS product lookup", () => {
  it("lets a cashier resolve a stored QR payload without exposing buying cost", async () => {
    const seeded = await seedPosShop("cashier");

    const result = await seeded.client.query(api.pos.lookupUnit, {
      input: "RSM:1:SKU:SHT-20260820-0001-001",
    });

    expect(result).toEqual({
      categoryCode: "SHT",
      categoryName: "Shirts",
      sku: "SHT-20260820-0001-001",
      unitId: seeded.unitIds[0],
    });
    expect(JSON.stringify(result)).not.toContain("buyingPrice");
  });

  it("does not resolve another shop's product", async () => {
    const seeded = await seedPosShop("owner");
    await seeded.t.run(async (ctx) => {
      const now = Date.now();
      const foreignUserId = await ctx.db.insert("users", {});
      const foreignShopId = await ctx.db.insert("shops", {
        name: "Foreign Shop",
        currencyCode: "BDT",
        timezone: "Asia/Dhaka",
        createdBy: foreignUserId,
        createdAt: now,
        updatedAt: now,
      });
      const categoryId = await ctx.db.insert("categories", {
        shopId: foreignShopId,
        name: "Foreign",
        code: "FOR",
        createdBy: foreignUserId,
        createdAt: now,
        updatedAt: now,
      });
      const batchId = await ctx.db.insert("productBatches", {
        shopId: foreignShopId,
        batchNumber: 1,
        buyingPriceMinor: 100,
        categoryId,
        createdAt: now,
        createdBy: foreignUserId,
        intakeDate: "2026-08-20",
        quantity: 1,
        requestKey: "99999999-9999-4999-8999-999999999999",
      });
      await ctx.db.insert("inventoryUnits", {
        shopId: foreignShopId,
        batchId,
        buyingPriceMinor: 100,
        categoryId,
        createdAt: now,
        createdBy: foreignUserId,
        qrPayload: "RSM:1:SKU:FOR-20260820-0001-001",
        sku: "FOR-20260820-0001-001",
        status: "in_stock",
        updatedAt: now,
      });
    });

    await expect(
      seeded.client.query(api.pos.lookupUnit, {
        input: "FOR-20260820-0001-001",
      }),
    ).rejects.toThrow("Product not found in this shop.");
  });

  it("rejects malformed input and inactive memberships", async () => {
    const seeded = await seedPosShop("cashier");
    await expect(
      seeded.client.query(api.pos.lookupUnit, { input: "https://example.com" }),
    ).rejects.toThrow("enter a valid SKU");

    await seeded.t.run(async (ctx) => {
      await ctx.db.patch(seeded.membershipId, { status: "disabled" });
    });
    await expect(
      seeded.client.query(api.pos.lookupUnit, {
        input: "SHT-20260820-0001-001",
      }),
    ).rejects.toThrow("active shop membership");
  });
});

describe("cash sale checkout", () => {
  it("sells multiple units atomically and returns the same receipt when retried", async () => {
    const seeded = await seedPosShop("cashier");
    const request = {
      cashTenderedMinor: 70000,
      items: [
        { inventoryUnitId: seeded.unitIds[0], sellingPriceMinor: 40000 },
        { inventoryUnitId: seeded.unitIds[1], sellingPriceMinor: 25050 },
      ],
      requestKey: "22222222-2222-4222-8222-222222222222",
    };

    const receipt = await seeded.client.mutation(api.pos.completeCashSale, request);
    expect(receipt).toMatchObject({
      businessDayNumber: 1,
      cashTenderedMinor: 70000,
      changeMinor: 4950,
      saleNumber: 1,
      totalMinor: 65050,
      unitCount: 2,
    });
    expect(JSON.stringify(receipt)).not.toContain("buyingPrice");

    await expect(
      seeded.client.query(api.pos.lookupUnit, {
        input: "SHT-20260820-0001-001",
      }),
    ).rejects.toThrow("This product is not available for sale.");

    await expect(
      seeded.client.mutation(api.pos.completeCashSale, request),
    ).resolves.toEqual(receipt);
  });

  it("leaves every unit sellable when checkout validation fails", async () => {
    const seeded = await seedPosShop("cashier");

    await expect(
      seeded.client.mutation(api.pos.completeCashSale, {
        cashTenderedMinor: 100,
        items: [
          { inventoryUnitId: seeded.unitIds[0], sellingPriceMinor: 40000 },
          { inventoryUnitId: seeded.unitIds[1], sellingPriceMinor: 25000 },
        ],
        requestKey: "66666666-6666-4666-8666-666666666666",
      }),
    ).rejects.toThrow("Cash received cannot be less than the sale total.");

    await expect(
      seeded.client.query(api.pos.lookupUnit, {
        input: "SHT-20260820-0001-001",
      }),
    ).resolves.toMatchObject({ sku: "SHT-20260820-0001-001" });
    await expect(
      seeded.client.query(api.pos.getCurrentBusinessDay, {}),
    ).resolves.toBeNull();
  });

  it("rejects duplicate units and carts larger than 50 products", async () => {
    const seeded = await seedPosShop("cashier");
    const repeatedItem = {
      inventoryUnitId: seeded.unitIds[0],
      sellingPriceMinor: 40000,
    };

    await expect(
      seeded.client.mutation(api.pos.completeCashSale, {
        cashTenderedMinor: 80000,
        items: [repeatedItem, repeatedItem],
        requestKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).rejects.toThrow("A product cannot appear twice");
    await expect(
      seeded.client.mutation(api.pos.completeCashSale, {
        cashTenderedMinor: 2040000,
        items: Array.from({ length: 51 }, () => repeatedItem),
        requestKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ).rejects.toThrow("between 1 and 50 products");
  });

  it("allows only one concurrent checkout to sell the same unit", async () => {
    const seeded = await seedPosShop("cashier");
    const item = {
      inventoryUnitId: seeded.unitIds[0],
      sellingPriceMinor: 40000,
    };
    const settled = await Promise.allSettled([
      seeded.client.mutation(api.pos.completeCashSale, {
        cashTenderedMinor: 40000,
        items: [item],
        requestKey: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      }),
      seeded.client.mutation(api.pos.completeCashSale, {
        cashTenderedMinor: 40000,
        items: [item],
        requestKey: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      }),
    ]);

    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
  });
});

describe("current business day", () => {
  it("shows cashier-safe running totals after a sale", async () => {
    const seeded = await seedPosShop("cashier");
    await seeded.client.mutation(api.pos.completeCashSale, {
      cashTenderedMinor: 50000,
      items: [
        { inventoryUnitId: seeded.unitIds[0], sellingPriceMinor: 45000 },
      ],
      requestKey: "33333333-3333-4333-8333-333333333333",
    });

    const current = await seeded.client.query(api.pos.getCurrentBusinessDay, {});
    expect(current).toMatchObject({
      canCloseDay: false,
      cashCollectedMinor: 45000,
      dayNumber: 1,
      grossSalesMinor: 45000,
      saleCount: 1,
      unitCount: 1,
    });
    expect(JSON.stringify(current)).not.toContain("costOfGoods");
    expect(JSON.stringify(current)).not.toContain("grossProfit");
  });
});

describe("End Day", () => {
  it("lets an owner close a nonempty day and opens the successor idempotently", async () => {
    const seeded = await seedPosShop("owner");
    await seeded.client.mutation(api.pos.completeCashSale, {
      cashTenderedMinor: 50000,
      items: [
        { inventoryUnitId: seeded.unitIds[0], sellingPriceMinor: 45000 },
      ],
      requestKey: "44444444-4444-4444-8444-444444444444",
    });
    const request = {
      requestKey: "55555555-5555-4555-8555-555555555555",
    };

    const closed = await seeded.client.mutation(api.pos.closeCurrentBusinessDay, request);
    expect(closed).toMatchObject({
      cashCollectedMinor: 45000,
      closedDayNumber: 1,
      costOfGoodsMinor: 30000,
      grossProfitMinor: 15000,
      grossSalesMinor: 45000,
      nextDayNumber: 2,
      saleCount: 1,
      unitCount: 1,
    });
    await expect(
      seeded.client.mutation(api.pos.closeCurrentBusinessDay, request),
    ).resolves.toEqual(closed);
    await expect(
      seeded.client.query(api.pos.getCurrentBusinessDay, {}),
    ).resolves.toMatchObject({
      canCloseDay: true,
      dayNumber: 2,
      saleCount: 0,
    });
    await expect(
      seeded.client.mutation(api.pos.closeCurrentBusinessDay, {
        requestKey: "13131313-1313-4313-8313-131313131313",
      }),
    ).rejects.toThrow("An empty business day cannot be closed.");

    await seeded.client.mutation(api.pos.completeCashSale, {
      cashTenderedMinor: 40000,
      items: [
        { inventoryUnitId: seeded.unitIds[1], sellingPriceMinor: 40000 },
      ],
      requestKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    await expect(
      seeded.client.query(api.pos.getCurrentBusinessDay, {}),
    ).resolves.toMatchObject({ dayNumber: 2, saleCount: 1, unitCount: 1 });
  });

  it("does not allow a cashier to close the day", async () => {
    const seeded = await seedPosShop("cashier");
    await seeded.client.mutation(api.pos.completeCashSale, {
      cashTenderedMinor: 40000,
      items: [
        { inventoryUnitId: seeded.unitIds[0], sellingPriceMinor: 40000 },
      ],
      requestKey: "77777777-7777-4777-8777-777777777777",
    });

    await expect(
      seeded.client.mutation(api.pos.closeCurrentBusinessDay, {
        requestKey: "88888888-8888-4888-8888-888888888888",
      }),
    ).rejects.toThrow("You do not have permission");
  });

  it("lets a manager sell and close the day", async () => {
    const seeded = await seedPosShop("manager");
    await seeded.client.mutation(api.pos.completeCashSale, {
      cashTenderedMinor: 40000,
      items: [
        { inventoryUnitId: seeded.unitIds[0], sellingPriceMinor: 40000 },
      ],
      requestKey: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    });

    await expect(
      seeded.client.mutation(api.pos.closeCurrentBusinessDay, {
        requestKey: "12121212-1212-4212-8212-121212121212",
      }),
    ).resolves.toMatchObject({ closedDayNumber: 1, nextDayNumber: 2 });
  });
});
