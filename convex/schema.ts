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
});
