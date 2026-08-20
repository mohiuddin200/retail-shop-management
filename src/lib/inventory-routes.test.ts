import { describe, expect, it } from "vitest";

import type { Id } from "@/../convex/_generated/dataModel";
import { getEmptyIntakeAction, inventoryRoutes } from "./inventory-routes";

describe("inventoryRoutes", () => {
  it("uses absolute paths for inventory entry points", () => {
    expect(inventoryRoutes.intake).toBe("/inventory/intake");
    expect(inventoryRoutes.categories).toBe("/inventory/categories");
  });

  it("uses an absolute path for batch details", () => {
    const batchId = "batch-id" as Id<"productBatches">;

    expect(inventoryRoutes.batchDetails(batchId)).toEqual({
      pathname: "/inventory/batches/[batchId]",
      params: { batchId },
    });
  });
});

  it("offers owners a way to create the required first category", () => {
    expect(getEmptyIntakeAction("owner")).toEqual({
      href: "/inventory/categories",
      label: "Create category",
    });
    expect(getEmptyIntakeAction("manager")).toBeNull();
    expect(getEmptyIntakeAction("cashier")).toBeNull();
  });
