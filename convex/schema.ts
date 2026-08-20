import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const membershipRole = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("cashier"),
);

const membershipStatus = v.union(
  v.literal("active"),
  v.literal("invited"),
  v.literal("disabled"),
);

const inventoryUnitStatus = v.union(
  v.literal("in_stock"),
  v.literal("sold"),
  v.literal("refunded"),
  v.literal("damaged"),
);

const businessDayStatus = v.union(v.literal("open"), v.literal("closed"));

export default defineSchema({
  ...authTables,
  shops: defineTable({
    name: v.string(),
    currencyCode: v.string(),
    timezone: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_created_by", ["createdBy"]),
  memberships: defineTable({
    shopId: v.id("shops"),
    userId: v.id("users"),
    role: membershipRole,
    status: membershipStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_shop", ["shopId"])
    .index("by_shop_and_user", ["shopId", "userId"]),
  categories: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    code: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_shop", ["shopId"])
    .index("by_shop_and_code", ["shopId", "code"]),
  productBatches: defineTable({
    shopId: v.id("shops"),
    batchNumber: v.number(),
    categoryId: v.id("categories"),
    buyingPriceMinor: v.number(),
    quantity: v.number(),
    intakeDate: v.string(),
    supplierReference: v.optional(v.string()),
    notes: v.optional(v.string()),
    requestKey: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_category", ["categoryId"])
    .index("by_shop_and_batch_number", ["shopId", "batchNumber"])
    .index("by_shop_and_request_key", ["shopId", "requestKey"]),
  inventoryUnits: defineTable({
    shopId: v.id("shops"),
    batchId: v.id("productBatches"),
    categoryId: v.id("categories"),
    sku: v.string(),
    buyingPriceMinor: v.number(),
    status: inventoryUnitStatus,
    qrPayload: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shop_and_sku", ["shopId", "sku"])
    .index("by_shop_and_status", ["shopId", "status"])
    .index("by_batch", ["batchId"])
    .index("by_category_and_status", ["categoryId", "status"]),
  businessDays: defineTable({
    shopId: v.id("shops"),
    dayNumber: v.number(),
    status: businessDayStatus,
    openedAt: v.number(),
    openedBy: v.id("users"),
    closedAt: v.optional(v.number()),
    closedBy: v.optional(v.id("users")),
    closeRequestKey: v.optional(v.string()),
    saleCount: v.number(),
    unitCount: v.number(),
    grossSalesMinor: v.number(),
    cashCollectedMinor: v.number(),
    costOfGoodsMinor: v.number(),
    grossProfitMinor: v.number(),
    returnCount: v.optional(v.number()),
    resalableReturnCount: v.optional(v.number()),
    damagedReturnCount: v.optional(v.number()),
    cashRefundedMinor: v.optional(v.number()),
    costRecoveredMinor: v.optional(v.number()),
  })
    .index("by_shop_and_status", ["shopId", "status"])
    .index("by_shop_and_day_number", ["shopId", "dayNumber"])
    .index("by_shop_and_close_request_key", ["shopId", "closeRequestKey"]),
  sales: defineTable({
    shopId: v.id("shops"),
    businessDayId: v.id("businessDays"),
    saleNumber: v.number(),
    paymentType: v.literal("cash"),
    unitCount: v.number(),
    totalMinor: v.number(),
    costOfGoodsMinor: v.number(),
    grossProfitMinor: v.number(),
    requestKey: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_business_day", ["businessDayId"])
    .index("by_shop_and_sale_number", ["shopId", "saleNumber"])
    .index("by_shop_and_request_key", ["shopId", "requestKey"]),
  saleItems: defineTable({
    shopId: v.id("shops"),
    saleId: v.id("sales"),
    businessDayId: v.id("businessDays"),
    inventoryUnitId: v.id("inventoryUnits"),
    categoryId: v.id("categories"),
    sku: v.string(),
    buyingPriceMinor: v.number(),
    sellingPriceMinor: v.number(),
    createdAt: v.number(),
  })
    .index("by_sale", ["saleId"])
    .index("by_inventory_unit", ["inventoryUnitId"])
    .index("by_business_day", ["businessDayId"]),
  payments: defineTable({
    shopId: v.id("shops"),
    saleId: v.id("sales"),
    businessDayId: v.id("businessDays"),
    method: v.literal("cash"),
    amountMinor: v.number(),
    tenderedMinor: v.number(),
    changeMinor: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_sale", ["saleId"])
    .index("by_business_day", ["businessDayId"]),
  returns: defineTable({
    shopId: v.id("shops"),
    businessDayId: v.id("businessDays"),
    originalBusinessDayId: v.id("businessDays"),
    saleId: v.id("sales"),
    saleItemId: v.id("saleItems"),
    inventoryUnitId: v.id("inventoryUnits"),
    sku: v.string(),
    refundAmountMinor: v.number(),
    costRecoveredMinor: v.number(),
    condition: v.union(v.literal("resalable"), v.literal("damaged")),
    reason: v.union(
      v.literal("changed_mind"),
      v.literal("size_or_fit"),
      v.literal("wrong_item"),
      v.literal("defective_or_damaged"),
      v.literal("other"),
    ),
    note: v.optional(v.string()),
    requestKey: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_shop_and_request_key", ["shopId", "requestKey"])
    .index("by_sale_item", ["saleItemId"])
    .index("by_business_day", ["businessDayId"]),
});
