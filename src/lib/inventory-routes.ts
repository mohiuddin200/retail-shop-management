import type { Doc, Id } from "@/../convex/_generated/dataModel";

export const inventoryRoutes = {
  categories: "/inventory/categories" as const,
  intake: "/inventory/intake" as const,
  batchDetails(batchId: Id<"productBatches">) {
    return {
      pathname: "/inventory/batches/[batchId]" as const,
      params: { batchId },
    };
  },
};

type MembershipRole = Doc<"memberships">["role"];

export function getEmptyIntakeAction(role: MembershipRole) {
  if (role !== "owner") return null;

  return {
    href: inventoryRoutes.categories,
    label: "Create category",
  } as const;
}
