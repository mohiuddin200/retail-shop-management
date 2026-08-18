import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/authorization";

export const createInitialShop = mutation({
  args: {
    name: v.string(),
    currencyCode: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingMembership) {
      throw new ConvexError("This account already belongs to a shop.");
    }

    const name = args.name.trim();
    const currencyCode = args.currencyCode.trim().toUpperCase();
    const timezone = args.timezone.trim();

    if (!name) {
      throw new ConvexError("Shop name is required.");
    }

    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      throw new ConvexError("Currency must be a three-letter ISO code.");
    }

    if (!timezone) {
      throw new ConvexError("Timezone is required.");
    }

    const now = Date.now();
    const shopId = await ctx.db.insert("shops", {
      name,
      currencyCode,
      timezone,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("memberships", {
      shopId,
      userId,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return shopId;
  },
});

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .collect();

    return Promise.all(
      memberships.map(async (membership) => ({
        membership,
        shop: await ctx.db.get(membership.shopId),
      })),
    );
  },
});
