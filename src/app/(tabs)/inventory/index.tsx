import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import { AppScreen } from "@/components/app-screen";
import {
  InventoryCard,
  InventoryEmpty,
  InventoryHeader,
  InventoryLoading,
  InventoryMetric,
} from "@/components/inventory-ui";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { formatMoney } from "@/lib/inventory-domain";

export default function InventoryHomeScreen() {
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const summary = useQuery(api.inventory.getSummary);
  const batches = usePaginatedQuery(api.inventory.listBatches, {}, { initialNumItems: 8 });

  if (!shopContext || !summary || batches.status === "LoadingFirstPage") {
    return (
      <AppScreen>
        <InventoryLoading />
      </AppScreen>
    );
  }

  const isOwner = shopContext.membership.role === "owner";

  return (
    <AppScreen>
      <InventoryHeader
        description="Track every physical unit with a permanent SKU and its original buying cost."
        title="Inventory"
      />

      <View style={styles.metrics}>
        <InventoryMetric
          icon="package-variant"
          label="Units in stock"
          value={String(summary.inStockUnitCount)}
        />
        <InventoryMetric
          icon="cash-multiple"
          label="Current stock cost"
          value={formatMoney(summary.inStockCostMinor, shopContext.shop.currencyCode)}
        />
        <InventoryMetric
          icon="shape-outline"
          label="Active categories"
          value={String(summary.activeCategoryCount)}
        />
        <InventoryMetric
          icon="layers-triple-outline"
          label="Intake batches"
          value={String(summary.batchCount)}
        />
      </View>

      <View style={styles.actions}>
        <Link asChild href="./intake">
          <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons color={Colors.light.surface} name="package-variant-plus" size={24} />
            </View>
            <View style={styles.actionCopy}>
              <ThemedText type="smallBold">Add stock</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Create an immutable batch and one SKU per unit.
              </ThemedText>
            </View>
            <MaterialCommunityIcons color={Colors.light.textSecondary} name="chevron-right" size={24} />
          </Pressable>
        </Link>

        <Link asChild href="./categories">
          <Pressable style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <View style={[styles.actionIcon, styles.actionIconSecondary]}>
              <MaterialCommunityIcons color={Colors.light.primary} name="shape-outline" size={24} />
            </View>
            <View style={styles.actionCopy}>
              <ThemedText type="smallBold">{isOwner ? "Manage categories" : "View categories"}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {isOwner ? "Create, edit, archive, or reactivate shop categories." : "Review the categories available for intake."}
              </ThemedText>
            </View>
            <MaterialCommunityIcons color={Colors.light.textSecondary} name="chevron-right" size={24} />
          </Pressable>
        </Link>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="subtitle">Recent batches</ThemedText>
          <ThemedText themeColor="textSecondary">
            Buying costs remain attached to the units from their original intake.
          </ThemedText>
        </View>

        <InventoryCard>
          {batches.results.length === 0 ? (
            <InventoryEmpty
              description="Create a category, then add opening stock to create the first batch."
              icon="package-variant-closed"
              title="No stock batches yet"
            />
          ) : (
            batches.results.map(({ batch, category }, index) => (
              <View key={batch._id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Link
                  href={{ pathname: "./batches/[batchId]", params: { batchId: batch._id } }}
                  asChild>
                  <Pressable style={({ pressed }) => [styles.batch, pressed && styles.pressed]}>
                    <View style={styles.batchCopy}>
                      <ThemedText type="smallBold">
                        Batch {String(batch.batchNumber).padStart(4, "0")} - {category?.name ?? "Unknown category"}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {batch.quantity} units - {batch.intakeDate} - {formatMoney(batch.buyingPriceMinor, shopContext.shop.currencyCode)} each
                      </ThemedText>
                    </View>
                    <MaterialCommunityIcons color={Colors.light.textSecondary} name="chevron-right" size={22} />
                  </Pressable>
                </Link>
              </View>
            ))
          )}
          {batches.status === "CanLoadMore" ? (
            <Pressable onPress={() => batches.loadMore(8)} style={styles.loadMore}>
              <ThemedText style={styles.loadMoreText} type="smallBold">Load more batches</ThemedText>
            </Pressable>
          ) : null}
        </InventoryCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  actions: { gap: Spacing.three },
  action: {
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.medium,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionIconSecondary: { backgroundColor: Colors.light.primaryMuted },
  actionCopy: { flex: 1, gap: Spacing.one },
  pressed: { opacity: 0.7 },
  section: { gap: Spacing.four },
  sectionHeading: { gap: Spacing.two },
  divider: { backgroundColor: Colors.light.border, height: 1, marginVertical: Spacing.two },
  batch: { alignItems: "center", flexDirection: "row", gap: Spacing.three, minHeight: 56 },
  batchCopy: { flex: 1, gap: Spacing.one },
  loadMore: { alignItems: "center", padding: Spacing.three },
  loadMoreText: { color: Colors.light.primary },
});
