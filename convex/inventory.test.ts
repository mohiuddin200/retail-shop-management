/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildSku } from "./inventory";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedMembership(role: "cashier" | "manager" | "owner") {
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
    await ctx.db.insert("memberships", {
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
    return { categoryId, shopId, userId };
  });

  return {
    ...seeded,
    client: t.withIdentity({ subject: seeded.userId }),
    t,
  };
}

async function seedBatch(
  seeded: Awaited<ReturnType<typeof seedMembership>>,
  quantity = 5,
) {
  return seeded.t.run(async (ctx) => {
    const now = Date.now();
    const batchId = await ctx.db.insert("productBatches", {
      batchNumber: 1,
      buyingPriceMinor: 30000,
      categoryId: seeded.categoryId,
      createdAt: now,
      createdBy: seeded.userId,
      intakeDate: "2026-08-20",
      quantity,
      requestKey: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      shopId: seeded.shopId,
    });

    for (let unitNumber = quantity; unitNumber >= 1; unitNumber -= 1) {
      const sku = buildSku("SHT", "2026-08-20", 1, unitNumber);
      await ctx.db.insert("inventoryUnits", {
        batchId,
        buyingPriceMinor: 30000,
        categoryId: seeded.categoryId,
        createdAt: now,
        createdBy: seeded.userId,
        qrPayload: `RSM:1:SKU:${sku}`,
        shopId: seeded.shopId,
        sku,
        status: "in_stock",
        updatedAt: now,
      });
    }

    return batchId;
  });
}


describe("inventory identity", () => {
  it("builds permanent, padded SKUs", () => {
    expect(buildSku("SHT", "2026-08-20", 1, 14)).toBe("SHT-20260820-0001-014");
  });
});

describe("inventory intake", () => {
  it("creates one unit per quantity and returns the same batch for a retried request", async () => {
    const { categoryId, client, t } = await seedMembership("owner");
    const request = {
      buyingPriceMinor: 30000,
      categoryId,
      intakeDate: "2026-08-20",
      quantity: 3,
      requestKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };
    const first = await client.mutation(api.inventory.createBatch, request);
    const retried = await client.mutation(api.inventory.createBatch, request);

    expect(retried.batchId).toBe(first.batchId);
    expect(first.firstSku).toBe("SHT-20260820-0001-001");
    expect(first.lastSku).toBe("SHT-20260820-0001-003");
    const records = await t.run(async (ctx) => ({
      batches: await ctx.db.query("productBatches").collect(),
      units: await ctx.db.query("inventoryUnits").collect(),
    }));
    expect(records.batches).toHaveLength(1);
    expect(records.units).toHaveLength(3);
    expect(records.units[0].qrPayload).toBe(`RSM:1:SKU:${records.units[0].sku}`);
  });

  it("allows managers but blocks cashiers", async () => {
    const manager = await seedMembership("manager");
    await expect(
      manager.client.mutation(api.inventory.createBatch, {
        buyingPriceMinor: 100,
        categoryId: manager.categoryId,
        intakeDate: "2026-08-20",
        quantity: 1,
        requestKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ).resolves.toMatchObject({ quantity: 1 });

    const cashier = await seedMembership("cashier");
    await expect(
      cashier.client.mutation(api.inventory.createBatch, {
        buyingPriceMinor: 100,
        categoryId: cashier.categoryId,
        intakeDate: "2026-08-20",
        quantity: 1,
        requestKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ).rejects.toThrow();
  });

  it("rejects another shop's category and invalid quantity boundaries", async () => {
    const owner = await seedMembership("owner");
    const foreignCategoryId = await owner.t.run(async (ctx) => {
      const now = Date.now();
      const foreignUserId = await ctx.db.insert("users", {});
      const foreignShopId = await ctx.db.insert("shops", {
        name: "Other Shop",
        currencyCode: "BDT",
        timezone: "Asia/Dhaka",
        createdBy: foreignUserId,
        createdAt: now,
        updatedAt: now,
      });
      return ctx.db.insert("categories", {
        shopId: foreignShopId,
        name: "Foreign",
        code: "FOR",
        createdBy: foreignUserId,
        createdAt: now,
        updatedAt: now,
      });
    });

    await expect(
      owner.client.mutation(api.inventory.createBatch, {
        buyingPriceMinor: 100,
        categoryId: foreignCategoryId as Id<"categories">,
        intakeDate: "2026-08-20",
        quantity: 1,
        requestKey: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      }),
    ).rejects.toThrow();

    await expect(
      owner.client.mutation(api.inventory.createBatch, {
        buyingPriceMinor: 100,
        categoryId: owner.categoryId,
        intakeDate: "2026-08-20",
        quantity: 501,
        requestKey: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      }),
    ).rejects.toThrow();
  });
});

describe("inventory label data", () => {
  it.each(["owner", "manager"] as const)(
    "allows an active %s and returns ordered, cost-free label records",
    async (role) => {
      const seeded = await seedMembership(role);
      const batchId = await seedBatch(seeded);

      const result = await seeded.client.query(api.inventory.getLabelData, {
        batchId,
        endUnit: 5,
        startUnit: 1,
      });

      expect(result.shop).toEqual({ name: "Test Shop" });
      expect(result.category).toEqual({ code: "SHT", name: "Shirts" });
      expect(result.units.map((unit) => unit.unitNumber)).toEqual([1, 2, 3, 4, 5]);
      expect(result.units[0]).toEqual({
        qrPayload: "RSM:1:SKU:SHT-20260820-0001-001",
        sku: "SHT-20260820-0001-001",
        unitNumber: 1,
      });
      expect(result.units[2].sku).toBe("SHT-20260820-0001-003");
      expect(result.units[4].qrPayload).toBe(
        "RSM:1:SKU:SHT-20260820-0001-005",
      );
      expect(JSON.stringify(result)).not.toContain("buyingPrice");
    },
  );

  it("blocks cashiers and another shop's batch", async () => {
    const cashier = await seedMembership("cashier");
    const cashierBatchId = await seedBatch(cashier);
    await expect(
      cashier.client.query(api.inventory.getLabelData, {
        batchId: cashierBatchId,
        endUnit: 1,
        startUnit: 1,
      }),
    ).rejects.toThrow();

    const owner = await seedMembership("owner");
    const foreignBatchId = await owner.t.run(async (ctx) => {
      const now = Date.now();
      const foreignUserId = await ctx.db.insert("users", {});
      const foreignShopId = await ctx.db.insert("shops", {
        createdAt: now,
        createdBy: foreignUserId,
        currencyCode: "BDT",
        name: "Other Shop",
        timezone: "Asia/Dhaka",
        updatedAt: now,
      });
      const foreignCategoryId = await ctx.db.insert("categories", {
        code: "FOR",
        createdAt: now,
        createdBy: foreignUserId,
        name: "Foreign",
        shopId: foreignShopId,
        updatedAt: now,
      });
      return ctx.db.insert("productBatches", {
        batchNumber: 1,
        buyingPriceMinor: 100,
        categoryId: foreignCategoryId,
        createdAt: now,
        createdBy: foreignUserId,
        intakeDate: "2026-08-20",
        quantity: 1,
        requestKey: "99999999-9999-4999-8999-999999999999",
        shopId: foreignShopId,
      });
    });

    await expect(
      owner.client.query(api.inventory.getLabelData, {
        batchId: foreignBatchId,
        endUnit: 1,
        startUnit: 1,
      }),
    ).rejects.toThrow();
  });

  it("rejects non-integer, reversed, and out-of-batch ranges", async () => {
    const owner = await seedMembership("owner");
    const batchId = await seedBatch(owner);

    for (const range of [
      { startUnit: 1.5, endUnit: 2 },
      { startUnit: 4, endUnit: 3 },
      { startUnit: 0, endUnit: 2 },
      { startUnit: 1, endUnit: 6 },
    ]) {
      await expect(
        owner.client.query(api.inventory.getLabelData, { batchId, ...range }),
      ).rejects.toThrow();
    }
  });
});
