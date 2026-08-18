import { query } from "./_generated/server";
import { requireUserId } from "./lib/authorization";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db.get(userId);
  },
});
