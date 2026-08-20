import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireActiveShop } from "./lib/authorization";

const posRoles = ["owner", "manager", "cashier"] as const;
const skuPattern = /^[A-Z0-9]{2,4}-\d{8}-\d{4,}-\d{3,}$/;
const qrPrefix = "RSM:1:SKU:";

export const lookupUnit = query({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, posRoles);
    const sku = normalizeSku(args.input);
    const unit = await ctx.db
      .query("inventoryUnits")
      .withIndex("by_shop_and_sku", (q) =>
        q.eq("shopId", shop._id).eq("sku", sku),
      )
      .unique();

    if (!unit) {
      throw new ConvexError("Product not found in this shop.");
    }
    if (unit.status !== "in_stock") {
      throw new ConvexError("This product is not available for sale.");
    }

    const category = await ctx.db.get(unit.categoryId);
    if (!category || category.shopId !== shop._id) {
      throw new ConvexError("Product category data is incomplete.");
    }

    return {
      categoryCode: category.code,
      categoryName: category.name,
      sku: unit.sku,
      unitId: unit._id,
    };
  },
});

export const lookupSoldUnitForReturn = query({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const { membership, shop } = await requireActiveShop(ctx, posRoles);
    const sku = normalizeSku(args.input);
    const unit = await ctx.db
      .query("inventoryUnits")
      .withIndex("by_shop_and_sku", (q) =>
        q.eq("shopId", shop._id).eq("sku", sku),
      )
      .unique();

    if (!unit) {
      throw new ConvexError("Product not found in this shop.");
    }
    if (unit.status !== "sold") {
      throw new ConvexError("Only a currently sold product can be returned.");
    }

    const saleItem = await ctx.db
      .query("saleItems")
      .withIndex("by_inventory_unit", (q) =>
        q.eq("inventoryUnitId", unit._id),
      )
      .order("desc")
      .first();
    if (!saleItem || saleItem.shopId !== shop._id) {
      throw new ConvexError("Original sale item data is incomplete.");
    }

    const [category, sale] = await Promise.all([
      ctx.db.get(unit.categoryId),
      ctx.db.get(saleItem.saleId),
    ]);
    if (!category || category.shopId !== shop._id) {
      throw new ConvexError("Product category data is incomplete.");
    }
    if (!sale || sale.shopId !== shop._id) {
      throw new ConvexError("Original sale data is incomplete.");
    }

    return {
      canMarkDamaged:
        membership.role === "owner" || membership.role === "manager",
      categoryCode: category.code,
      categoryName: category.name,
      originalSellingPriceMinor: saleItem.sellingPriceMinor,
      originalSoldAt: sale.createdAt,
      saleItemId: saleItem._id,
      saleNumber: sale.saleNumber,
      sku: unit.sku,
      unitId: unit._id,
    };
  },
});

export const getCurrentBusinessDay = query({
  args: {},
  handler: async (ctx) => {
    const { membership, shop } = await requireActiveShop(ctx, posRoles);
    const businessDay = await ctx.db
      .query("businessDays")
      .withIndex("by_shop_and_status", (q) =>
        q.eq("shopId", shop._id).eq("status", "open"),
      )
      .unique();
    if (!businessDay) return null;

    const cashRefundedMinor = businessDay.cashRefundedMinor ?? 0;
    return {
      canCloseDay:
        membership.role === "owner" || membership.role === "manager",
      cashCollectedMinor: businessDay.cashCollectedMinor,
      cashRefundedMinor,
      damagedReturnCount: businessDay.damagedReturnCount ?? 0,
      dayNumber: businessDay.dayNumber,
      grossSalesMinor: businessDay.grossSalesMinor,
      netCashMinor: businessDay.cashCollectedMinor - cashRefundedMinor,
      netSalesMinor: businessDay.grossSalesMinor - cashRefundedMinor,
      openedAt: businessDay.openedAt,
      resalableReturnCount: businessDay.resalableReturnCount ?? 0,
      returnCount: businessDay.returnCount ?? 0,
      saleCount: businessDay.saleCount,
      unitCount: businessDay.unitCount,
    };
  },
});

export const completeCashSale = mutation({
  args: {
    cashTenderedMinor: v.number(),
    items: v.array(
      v.object({
        inventoryUnitId: v.id("inventoryUnits"),
        sellingPriceMinor: v.number(),
      }),
    ),
    requestKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { shop, userId } = await requireActiveShop(ctx, posRoles);
    const requestKey = validateRequestKey(args.requestKey);
    const existing = await ctx.db
      .query("sales")
      .withIndex("by_shop_and_request_key", (q) =>
        q.eq("shopId", shop._id).eq("requestKey", requestKey),
      )
      .unique();
    if (existing) {
      return saleReceipt(ctx, existing);
    }

    if (args.items.length < 1 || args.items.length > 50) {
      throw new ConvexError("A sale must contain between 1 and 50 products.");
    }
    const unitIds = new Set(args.items.map((item) => item.inventoryUnitId));
    if (unitIds.size !== args.items.length) {
      throw new ConvexError("A product cannot appear twice in the same sale.");
    }
    if (
      !Number.isSafeInteger(args.cashTenderedMinor) ||
      args.cashTenderedMinor <= 0
    ) {
      throw new ConvexError("Cash received must be a positive amount.");
    }

    const resolvedItems = await Promise.all(
      args.items.map(async (item) => {
        if (
          !Number.isSafeInteger(item.sellingPriceMinor) ||
          item.sellingPriceMinor <= 0
        ) {
          throw new ConvexError("Every selling price must be a positive amount.");
        }
        const unit = await ctx.db.get(item.inventoryUnitId);
        if (!unit || unit.shopId !== shop._id) {
          throw new ConvexError("Product not found in this shop.");
        }
        if (unit.status !== "in_stock") {
          throw new ConvexError(`${unit.sku} is not available for sale.`);
        }
        return { sellingPriceMinor: item.sellingPriceMinor, unit };
      }),
    );
    const totalMinor = resolvedItems.reduce(
      (total, item) => total + item.sellingPriceMinor,
      0,
    );
    const costOfGoodsMinor = resolvedItems.reduce(
      (total, item) => total + item.unit.buyingPriceMinor,
      0,
    );
    if (!Number.isSafeInteger(totalMinor) || !Number.isSafeInteger(costOfGoodsMinor)) {
      throw new ConvexError("The sale total is too large.");
    }
    if (args.cashTenderedMinor < totalMinor) {
      throw new ConvexError("Cash received cannot be less than the sale total.");
    }

    const now = Date.now();
    const businessDay = await getOrCreateOpenBusinessDay(ctx, shop._id, userId, now);
    const latestSale = await ctx.db
      .query("sales")
      .withIndex("by_shop_and_sale_number", (q) => q.eq("shopId", shop._id))
      .order("desc")
      .first();
    const saleNumber = (latestSale?.saleNumber ?? 0) + 1;
    const grossProfitMinor = totalMinor - costOfGoodsMinor;
    const saleId = await ctx.db.insert("sales", {
      shopId: shop._id,
      businessDayId: businessDay._id,
      saleNumber,
      paymentType: "cash",
      unitCount: resolvedItems.length,
      totalMinor,
      costOfGoodsMinor,
      grossProfitMinor,
      requestKey,
      createdBy: userId,
      createdAt: now,
    });

    for (const item of resolvedItems) {
      await ctx.db.insert("saleItems", {
        shopId: shop._id,
        saleId,
        businessDayId: businessDay._id,
        inventoryUnitId: item.unit._id,
        categoryId: item.unit.categoryId,
        sku: item.unit.sku,
        buyingPriceMinor: item.unit.buyingPriceMinor,
        sellingPriceMinor: item.sellingPriceMinor,
        createdAt: now,
      });
      await ctx.db.patch(item.unit._id, { status: "sold", updatedAt: now });
    }

    const changeMinor = args.cashTenderedMinor - totalMinor;
    await ctx.db.insert("payments", {
      shopId: shop._id,
      saleId,
      businessDayId: businessDay._id,
      method: "cash",
      amountMinor: totalMinor,
      tenderedMinor: args.cashTenderedMinor,
      changeMinor,
      createdBy: userId,
      createdAt: now,
    });
    await ctx.db.patch(businessDay._id, {
      saleCount: businessDay.saleCount + 1,
      unitCount: businessDay.unitCount + resolvedItems.length,
      grossSalesMinor: businessDay.grossSalesMinor + totalMinor,
      cashCollectedMinor: businessDay.cashCollectedMinor + totalMinor,
      costOfGoodsMinor: businessDay.costOfGoodsMinor + costOfGoodsMinor,
      grossProfitMinor: businessDay.grossProfitMinor + grossProfitMinor,
    });

    return {
      businessDayId: businessDay._id,
      businessDayNumber: businessDay.dayNumber,
      cashTenderedMinor: args.cashTenderedMinor,
      changeMinor,
      createdAt: now,
      saleId,
      saleNumber,
      totalMinor,
      unitCount: resolvedItems.length,
    };
  },
});

export const completeCashReturn = mutation({
  args: {
    condition: v.union(v.literal("resalable"), v.literal("damaged")),
    note: v.optional(v.string()),
    reason: v.union(
      v.literal("changed_mind"),
      v.literal("size_or_fit"),
      v.literal("wrong_item"),
      v.literal("defective_or_damaged"),
      v.literal("other"),
    ),
    requestKey: v.string(),
    saleItemId: v.id("saleItems"),
  },
  handler: async (ctx, args) => {
    const { membership, shop, userId } = await requireActiveShop(ctx, posRoles);
    const requestKey = validateRequestKey(args.requestKey);
    const existing = await ctx.db
      .query("returns")
      .withIndex("by_shop_and_request_key", (q) =>
        q.eq("shopId", shop._id).eq("requestKey", requestKey),
      )
      .unique();
    if (existing) return returnReceipt(ctx, existing);

    if (
      args.condition === "damaged" &&
      membership.role !== "owner" &&
      membership.role !== "manager"
    ) {
      throw new ConvexError(
        "Only an owner or manager can mark a returned product as damaged.",
      );
    }
    const note = validateReturnNote(args.reason, args.note);
    const saleItem = await ctx.db.get(args.saleItemId);
    if (!saleItem || saleItem.shopId !== shop._id) {
      throw new ConvexError("Original sale item not found in this shop.");
    }
    const existingForItem = await ctx.db
      .query("returns")
      .withIndex("by_sale_item", (q) => q.eq("saleItemId", saleItem._id))
      .unique();
    if (existingForItem) {
      throw new ConvexError("This sold product has already been returned.");
    }
    const unit = await ctx.db.get(saleItem.inventoryUnitId);
    if (!unit || unit.shopId !== shop._id) {
      throw new ConvexError("Product not found in this shop.");
    }
    if (unit.status !== "sold") {
      throw new ConvexError("This product is not currently eligible for return.");
    }

    const latestSaleItem = await ctx.db
      .query("saleItems")
      .withIndex("by_inventory_unit", (q) =>
        q.eq("inventoryUnitId", unit._id),
      )
      .order("desc")
      .first();
    if (!latestSaleItem || latestSaleItem._id !== saleItem._id) {
      throw new ConvexError("Only the product's latest sale can be returned.");
    }
    const sale = await ctx.db.get(saleItem.saleId);
    if (!sale || sale.shopId !== shop._id) {
      throw new ConvexError("Original sale data is incomplete.");
    }

    const now = Date.now();
    const businessDay = await getOrCreateOpenBusinessDay(
      ctx,
      shop._id,
      userId,
      now,
    );
    const costRecoveredMinor =
      args.condition === "resalable" ? saleItem.buyingPriceMinor : 0;
    const returnId = await ctx.db.insert("returns", {
      businessDayId: businessDay._id,
      condition: args.condition,
      costRecoveredMinor,
      createdAt: now,
      createdBy: userId,
      inventoryUnitId: unit._id,
      ...(note ? { note } : {}),
      originalBusinessDayId: saleItem.businessDayId,
      reason: args.reason,
      refundAmountMinor: saleItem.sellingPriceMinor,
      requestKey,
      saleId: sale._id,
      saleItemId: saleItem._id,
      shopId: shop._id,
      sku: unit.sku,
    });
    await ctx.db.patch(unit._id, {
      status: args.condition === "resalable" ? "in_stock" : "damaged",
      updatedAt: now,
    });
    await ctx.db.patch(businessDay._id, {
      cashRefundedMinor:
        (businessDay.cashRefundedMinor ?? 0) + saleItem.sellingPriceMinor,
      costRecoveredMinor:
        (businessDay.costRecoveredMinor ?? 0) + costRecoveredMinor,
      damagedReturnCount:
        (businessDay.damagedReturnCount ?? 0) +
        (args.condition === "damaged" ? 1 : 0),
      resalableReturnCount:
        (businessDay.resalableReturnCount ?? 0) +
        (args.condition === "resalable" ? 1 : 0),
      returnCount: (businessDay.returnCount ?? 0) + 1,
    });
    const created = await ctx.db.get(returnId);
    if (!created) throw new ConvexError("The return could not be completed.");
    return returnReceipt(ctx, created);
  },
});

export const closeCurrentBusinessDay = mutation({
  args: { requestKey: v.string() },
  handler: async (ctx, args) => {
    const { shop, userId } = await requireActiveShop(ctx, ["owner", "manager"]);
    const requestKey = validateRequestKey(args.requestKey);
    const previouslyClosed = await ctx.db
      .query("businessDays")
      .withIndex("by_shop_and_close_request_key", (q) =>
        q.eq("shopId", shop._id).eq("closeRequestKey", requestKey),
      )
      .unique();
    if (previouslyClosed) {
      const successor = await ctx.db
        .query("businessDays")
        .withIndex("by_shop_and_day_number", (q) =>
          q
            .eq("shopId", shop._id)
            .eq("dayNumber", previouslyClosed.dayNumber + 1),
        )
        .unique();
      if (!successor) {
        throw new ConvexError("The next business day data is incomplete.");
      }
      return closeReceipt(previouslyClosed, successor);
    }

    const current = await ctx.db
      .query("businessDays")
      .withIndex("by_shop_and_status", (q) =>
        q.eq("shopId", shop._id).eq("status", "open"),
      )
      .unique();
    if (!current) {
      throw new ConvexError("There is no open business day to close.");
    }
    if (current.saleCount === 0 && (current.returnCount ?? 0) === 0) {
      throw new ConvexError("An empty business day cannot be closed.");
    }

    const now = Date.now();
    await ctx.db.patch(current._id, {
      closeRequestKey: requestKey,
      closedAt: now,
      closedBy: userId,
      status: "closed",
    });
    const successorId = await ctx.db.insert("businessDays", {
      shopId: shop._id,
      dayNumber: current.dayNumber + 1,
      status: "open",
      openedAt: now,
      openedBy: userId,
      saleCount: 0,
      unitCount: 0,
      grossSalesMinor: 0,
      cashCollectedMinor: 0,
      costOfGoodsMinor: 0,
      grossProfitMinor: 0,
      returnCount: 0,
      resalableReturnCount: 0,
      damagedReturnCount: 0,
      cashRefundedMinor: 0,
      costRecoveredMinor: 0,
    });
    const [closed, successor] = await Promise.all([
      ctx.db.get(current._id),
      ctx.db.get(successorId),
    ]);
    if (!closed || !successor) {
      throw new ConvexError("The business day could not be closed.");
    }
    return closeReceipt(closed, successor);
  },
});

function normalizeSku(value: string) {
  const normalized = value.trim().toUpperCase();
  const sku = normalized.startsWith(qrPrefix)
    ? normalized.slice(qrPrefix.length)
    : normalized;
  if (!skuPattern.test(sku)) {
    throw new ConvexError(
      "Scan a Retail Shop Manager QR code or enter a valid SKU.",
    );
  }
  return sku;
}

function validateRequestKey(value: string) {
  const requestKey = value.trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    throw new ConvexError("A valid request key is required.");
  }
  return requestKey;
}

async function getOrCreateOpenBusinessDay(
  ctx: MutationCtx,
  shopId: Id<"shops">,
  userId: Id<"users">,
  now: number,
) {
  const existing = await ctx.db
    .query("businessDays")
    .withIndex("by_shop_and_status", (q) =>
      q.eq("shopId", shopId).eq("status", "open"),
    )
    .unique();
  if (existing) return existing;

  const latest = await ctx.db
    .query("businessDays")
    .withIndex("by_shop_and_day_number", (q) => q.eq("shopId", shopId))
    .order("desc")
    .first();
  const businessDayId = await ctx.db.insert("businessDays", {
    shopId,
    dayNumber: (latest?.dayNumber ?? 0) + 1,
    status: "open",
    openedAt: now,
    openedBy: userId,
    saleCount: 0,
    unitCount: 0,
    grossSalesMinor: 0,
    cashCollectedMinor: 0,
    costOfGoodsMinor: 0,
    grossProfitMinor: 0,
    returnCount: 0,
    resalableReturnCount: 0,
    damagedReturnCount: 0,
    cashRefundedMinor: 0,
    costRecoveredMinor: 0,
  });
  const businessDay = await ctx.db.get(businessDayId);
  if (!businessDay) throw new ConvexError("The business day could not be opened.");
  return businessDay;
}

async function saleReceipt(ctx: MutationCtx, sale: Doc<"sales">) {
  const [businessDay, payment] = await Promise.all([
    ctx.db.get(sale.businessDayId),
    ctx.db.query("payments").withIndex("by_sale", (q) => q.eq("saleId", sale._id)).unique(),
  ]);
  if (!businessDay || !payment) {
    throw new ConvexError("Sale receipt data is incomplete.");
  }
  return {
    businessDayId: businessDay._id,
    businessDayNumber: businessDay.dayNumber,
    cashTenderedMinor: payment.tenderedMinor,
    changeMinor: payment.changeMinor,
    createdAt: sale.createdAt,
    saleId: sale._id,
    saleNumber: sale.saleNumber,
    totalMinor: sale.totalMinor,
    unitCount: sale.unitCount,
  };
}

function validateReturnNote(
  reason: Doc<"returns">["reason"],
  value: string | undefined,
) {
  const note = value?.trim() ?? "";
  if (note.length > 500) {
    throw new ConvexError("Return notes must be 500 characters or fewer.");
  }
  if (reason === "other" && !note) {
    throw new ConvexError(
      "Describe the return reason when Other is selected.",
    );
  }
  return note || undefined;
}

async function returnReceipt(ctx: MutationCtx, returned: Doc<"returns">) {
  const businessDay = await ctx.db.get(returned.businessDayId);
  if (!businessDay) {
    throw new ConvexError("Return receipt data is incomplete.");
  }
  return {
    businessDayId: businessDay._id,
    businessDayNumber: businessDay.dayNumber,
    condition: returned.condition,
    createdAt: returned.createdAt,
    refundAmountMinor: returned.refundAmountMinor,
    returnId: returned._id,
    sku: returned.sku,
  };
}

function closeReceipt(
  closed: Doc<"businessDays">,
  successor: Doc<"businessDays">,
) {
  const cashRefundedMinor = closed.cashRefundedMinor ?? 0;
  const costRecoveredMinor = closed.costRecoveredMinor ?? 0;
  return {
    adjustedGrossProfitMinor:
      closed.grossProfitMinor - cashRefundedMinor + costRecoveredMinor,
    cashCollectedMinor: closed.cashCollectedMinor,
    cashRefundedMinor,
    closedAt: closed.closedAt,
    closedDayNumber: closed.dayNumber,
    costOfGoodsMinor: closed.costOfGoodsMinor,
    costRecoveredMinor,
    damagedReturnCount: closed.damagedReturnCount ?? 0,
    grossProfitMinor: closed.grossProfitMinor,
    grossSalesMinor: closed.grossSalesMinor,
    netCashMinor: closed.cashCollectedMinor - cashRefundedMinor,
    netSalesMinor: closed.grossSalesMinor - cashRefundedMinor,
    nextDayNumber: successor.dayNumber,
    resalableReturnCount: closed.resalableReturnCount ?? 0,
    returnCount: closed.returnCount ?? 0,
    saleCount: closed.saleCount,
    unitCount: closed.unitCount,
  };
}
