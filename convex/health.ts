import { query } from "./_generated/server";

export const check = query({
  args: {},
  handler: async () => ({
    service: "retail-shop",
    status: "ok" as const,
  }),
});
