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

    return {
      canCloseDay:
        membership.role === "owner" || membership.role === "manager",
      cashCollectedMinor: businessDay.cashCollectedMinor,
      dayNumber: businessDay.dayNumber,
      grossSalesMinor: businessDay.grossSalesMinor,
      openedAt: businessDay.openedAt,
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
    if (current.saleCount === 0) {
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

function closeReceipt(
  closed: Doc<"businessDays">,
  successor: Doc<"businessDays">,
) {
  return {
    cashCollectedMinor: closed.cashCollectedMinor,
    closedAt: closed.closedAt,
    closedDayNumber: closed.dayNumber,
    costOfGoodsMinor: closed.costOfGoodsMinor,
    grossProfitMinor: closed.grossProfitMinor,
    grossSalesMinor: closed.grossSalesMinor,
    nextDayNumber: successor.dayNumber,
    saleCount: closed.saleCount,
    unitCount: closed.unitCount,
  };
}
