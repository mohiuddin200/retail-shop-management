import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireActiveShop } from "./lib/authorization";

const codePattern = /^[A-Z0-9]{2,4}$/;

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, ["owner", "manager"]);
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
      .collect();

    return categories
      .filter((category) => args.includeArchived || category.archivedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: { code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { shop, userId } = await requireActiveShop(ctx, ["owner"]);
    const name = normalizeName(args.name);
    const code = normalizeCode(args.code);
    await assertUniqueCategory(ctx, shop._id, name, code);
    const now = Date.now();

    return ctx.db.insert("categories", {
      shopId: shop._id,
      name,
      code,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { categoryId: v.id("categories"), code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, ["owner"]);
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.shopId !== shop._id) {
      throw new ConvexError("Category not found.");
    }

    const name = normalizeName(args.name);
    const code = normalizeCode(args.code);
    if (code !== category.code) {
      const batch = await ctx.db
        .query("productBatches")
        .withIndex("by_category", (q) => q.eq("categoryId", category._id))
        .first();
      if (batch) {
        throw new ConvexError("A category code cannot change after stock has been added.");
      }
    }

    await assertUniqueCategory(ctx, shop._id, name, code, category._id);
    await ctx.db.patch(category._id, { code, name, updatedAt: Date.now() });
  },
});

export const setArchived = mutation({
  args: { archived: v.boolean(), categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const { shop } = await requireActiveShop(ctx, ["owner"]);
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.shopId !== shop._id) {
      throw new ConvexError("Category not found.");
    }

    await ctx.db.patch(category._id, {
      archivedAt: args.archived ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

function normalizeName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) {
    throw new ConvexError("Category name must be between 2 and 60 characters.");
  }
  return name;
}

function normalizeCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!codePattern.test(code)) {
    throw new ConvexError("Category code must be 2 to 4 uppercase letters or numbers.");
  }
  return code;
}

async function assertUniqueCategory(
  ctx: MutationCtx,
  shopId: Id<"shops">,
  name: string,
  code: string,
  ignoredId?: Id<"categories">,
) {
  const codeMatch = await ctx.db
    .query("categories")
    .withIndex("by_shop_and_code", (q) => q.eq("shopId", shopId).eq("code", code))
    .first();
  if (codeMatch && codeMatch._id !== ignoredId) {
    throw new ConvexError("That category code is already in use.");
  }

  const categories = await ctx.db
    .query("categories")
    .withIndex("by_shop", (q) => q.eq("shopId", shopId))
    .collect();
  if (
    categories.some(
      (category) =>
        category._id !== ignoredId &&
        category.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  ) {
    throw new ConvexError("That category name is already in use.");
  }
}
