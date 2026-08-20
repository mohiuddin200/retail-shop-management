import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireActiveShop } from "./lib/authorization";

const inventoryRoles = ["owner", "manager"] as const;

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const { shop } = await requireActiveShop(ctx, inventoryRoles);
    const [categories, batches, inStockUnits] = await Promise.all([
      ctx.db.query("categories").withIndex("by_shop", (q) => q.eq("shopId", shop._id)).collect(),
      ctx.db.query("productBatches").withIndex("by_shop", (q) => q.eq("shopId", shop._id)).collect(),
      ctx.db
        .query("inventoryUnits")
        .withIndex("by_shop_and_status", (q) =>
          q.eq("shopId", shop._id).eq("status", "in_stock"),
        )
        .collect(),
    ]);

    return {
      activeCategoryCount: categories.filter((category) => category.archivedAt === undefined).length,
      batchCount: batches.length,
      inStockCostMinor: inStockUnits.reduce((total, unit) => total + unit.buyingPriceMinor, 0),
      inStockUnitCount: inStockUnits.length,
    };
  },
});

export const listBatches = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, inventoryRoles);
    const result = await ctx.db
      .query("productBatches")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (batch) => ({
          batch,
          category: await ctx.db.get(batch.categoryId),
        })),
      ),
    };
  },
});

export const getBatch = query({
  args: { batchId: v.id("productBatches") },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, inventoryRoles);
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.shopId !== shop._id) {
      throw new ConvexError("Batch not found.");
    }

    return { batch, category: await ctx.db.get(batch.categoryId) };
  },
});

export const listBatchUnits = query({
  args: { batchId: v.id("productBatches"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, inventoryRoles);
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.shopId !== shop._id) {
      throw new ConvexError("Batch not found.");
    }

    return ctx.db
      .query("inventoryUnits")
      .withIndex("by_batch", (q) => q.eq("batchId", batch._id))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

export const createBatch = mutation({
  args: {
    buyingPriceMinor: v.number(),
    categoryId: v.id("categories"),
    intakeDate: v.string(),
    notes: v.optional(v.string()),
    quantity: v.number(),
    requestKey: v.string(),
    supplierReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { shop, userId } = await requireActiveShop(ctx, inventoryRoles);
    const requestKey = args.requestKey.trim();
    if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
      throw new ConvexError("A valid intake request key is required.");
    }

    const existing = await ctx.db
      .query("productBatches")
      .withIndex("by_shop_and_request_key", (q) =>
        q.eq("shopId", shop._id).eq("requestKey", requestKey),
      )
      .unique();
    if (existing) {
      return batchResult(existing, await ctx.db.get(existing.categoryId));
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.shopId !== shop._id || category.archivedAt !== undefined) {
      throw new ConvexError("Select an active category from this shop.");
    }
    if (!Number.isSafeInteger(args.buyingPriceMinor) || args.buyingPriceMinor <= 0) {
      throw new ConvexError("Buying price must be a positive amount.");
    }
    if (!Number.isSafeInteger(args.quantity) || args.quantity < 1 || args.quantity > 500) {
      throw new ConvexError("Quantity must be a whole number between 1 and 500.");
    }

    assertIntakeDate(args.intakeDate, shop.timezone);
    const supplierReference = optionalText(args.supplierReference, 100, "Supplier/reference");
    const notes = optionalText(args.notes, 500, "Notes");
    const latestBatch = await ctx.db
      .query("productBatches")
      .withIndex("by_shop_and_batch_number", (q) => q.eq("shopId", shop._id))
      .order("desc")
      .first();
    const batchNumber = (latestBatch?.batchNumber ?? 0) + 1;
    const now = Date.now();
    const batchId = await ctx.db.insert("productBatches", {
      shopId: shop._id,
      batchNumber,
      categoryId: category._id,
      buyingPriceMinor: args.buyingPriceMinor,
      quantity: args.quantity,
      intakeDate: args.intakeDate,
      supplierReference,
      notes,
      requestKey,
      createdBy: userId,
      createdAt: now,
    });

    for (let unitNumber = 1; unitNumber <= args.quantity; unitNumber += 1) {
      const sku = buildSku(category.code, args.intakeDate, batchNumber, unitNumber);
      await ctx.db.insert("inventoryUnits", {
        shopId: shop._id,
        batchId,
        categoryId: category._id,
        sku,
        buyingPriceMinor: args.buyingPriceMinor,
        status: "in_stock",
        qrPayload: `RSM:1:SKU:${sku}`,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    const batch = await ctx.db.get(batchId);
    if (!batch) {
      throw new ConvexError("The new batch could not be loaded.");
    }

    return batchResult(batch, category);
  },
});

export function buildSku(
  code: string,
  intakeDate: string,
  batchNumber: number,
  unitNumber: number,
) {
  return `${code}-${intakeDate.replaceAll("-", "")}-${String(batchNumber).padStart(4, "0")}-${String(unitNumber).padStart(3, "0")}`;
}

function batchResult(batch: Doc<"productBatches">, category: Doc<"categories"> | null) {
  if (!category) {
    throw new ConvexError("Category data is incomplete.");
  }

  return {
    batchId: batch._id,
    batchNumber: batch.batchNumber,
    firstSku: buildSku(category.code, batch.intakeDate, batch.batchNumber, 1),
    lastSku: buildSku(category.code, batch.intakeDate, batch.batchNumber, batch.quantity),
    quantity: batch.quantity,
  };
}

function optionalText(value: string | undefined, maxLength: number, label: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    throw new ConvexError(`${label} is too long.`);
  }
  return trimmed;
}

function assertIntakeDate(value: string, timezone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ConvexError("Intake date must use YYYY-MM-DD.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new ConvexError("Intake date is not a valid calendar date.");
  }

  if (value > dateInTimeZone(new Date(), timezone)) {
    throw new ConvexError("Intake date cannot be in the future.");
  }
}

function dateInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "day" | "month" | "year") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
