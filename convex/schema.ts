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
});
