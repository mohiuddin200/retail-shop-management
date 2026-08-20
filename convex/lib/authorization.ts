import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";

export type ShopRole = "owner" | "manager" | "cashier";

export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);

  if (!userId) {
    throw new ConvexError("Authentication required.");
  }

  return userId;
}

export async function requireActiveShop(
  ctx: QueryCtx | MutationCtx,
  allowedRoles?: readonly ShopRole[],
) {
  const userId = await requireUserId(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userId", userId).eq("status", "active"),
    )
    .order("asc")
    .first();

  if (!membership) {
    throw new ConvexError("An active shop membership is required.");
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ConvexError("You do not have permission to perform this action.");
  }

  const shop = await ctx.db.get(membership.shopId);
  if (!shop) {
    throw new ConvexError("Shop membership data is incomplete.");
  }

  return { membership, shop, userId };
}
