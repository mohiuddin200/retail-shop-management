import { router, useLocalSearchParams } from "expo-router";
import { usePaginatedQuery, useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppScreen } from "@/components/app-screen";
import {
  InventoryButton,
  InventoryCard,
  InventoryEmpty,
  InventoryHeader,
  InventoryLoading,
} from "@/components/inventory-ui";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { formatMoney } from "@/lib/inventory-domain";

export default function BatchDetailsScreen() {
  const params = useLocalSearchParams<{ batchId: string }>();
  const batchId = params.batchId as Id<"productBatches">;
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const detail = useQuery(api.inventory.getBatch, { batchId });
  const units = usePaginatedQuery(
    api.inventory.listBatchUnits,
    { batchId },
    { initialNumItems: 50 },
  );

  if (!shopContext || !detail || units.status === "LoadingFirstPage") {
    return <AppScreen><InventoryLoading /></AppScreen>;
  }

  const { batch, category } = detail;

  return (
    <AppScreen>
      <InventoryHeader
        description="This intake record and every unit identity are permanent."
        eyebrow={`BATCH ${String(batch.batchNumber).padStart(4, "0")}`}
        title={category?.name ?? "Inventory batch"}
      />

      <InventoryCard>
        <ThemedText type="subtitle">Batch record</ThemedText>
        <DetailRow label="Category code" value={category?.code ?? "Unknown"} />
        <DetailRow label="Intake date" value={batch.intakeDate} />
        <DetailRow label="Quantity" value={String(batch.quantity)} />
        <DetailRow label="Buying price per unit" value={formatMoney(batch.buyingPriceMinor, shopContext.shop.currencyCode)} />
        <DetailRow label="Total buying cost" value={formatMoney(batch.buyingPriceMinor * batch.quantity, shopContext.shop.currencyCode)} />
        <DetailRow label="Supplier/reference" value={batch.supplierReference ?? "Not recorded"} />
        <DetailRow label="Notes" value={batch.notes ?? "Not recorded"} />
        <InventoryButton
          icon="printer-outline"
          label="Print labels"
          onPress={() =>
            router.push({ pathname: "/inventory/batches/[batchId]/labels", params: { batchId } })
          }
        />
      </InventoryCard>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="subtitle">Unit identities</ThemedText>
          <ThemedText themeColor="textSecondary">
            QR payloads contain only the versioned SKU lookup key, never buying cost.
          </ThemedText>
        </View>
        <InventoryCard>
          {units.results.length === 0 ? (
            <InventoryEmpty description="No units were found for this batch." icon="barcode-off" title="No units" />
          ) : (
            units.results.map((unit, index) => (
              <View key={unit._id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.unit}>
                  <View style={styles.unitNumber}>
                    <ThemedText type="code">{String(index + 1).padStart(3, "0")}</ThemedText>
                  </View>
                  <View style={styles.unitCopy}>
                    <ThemedText type="code">{unit.sku}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {unit.status.replace("_", " ")} - {unit.qrPayload}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))
          )}
          {units.status === "CanLoadMore" ? (
            <InventoryButton label="Load more units" onPress={() => units.loadMore(50)} secondary />
          ) : null}
        </InventoryCard>
      </View>
    </AppScreen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText themeColor="textSecondary" type="small">{label}</ThemedText>
      <ThemedText style={styles.detailValue} type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: { flexDirection: "row", gap: Spacing.three, justifyContent: "space-between" },
  detailValue: { flex: 1, textAlign: "right" },
  section: { gap: Spacing.four },
  sectionHeading: { gap: Spacing.two },
  divider: { backgroundColor: Colors.light.border, height: 1, marginVertical: Spacing.two },
  unit: { alignItems: "center", flexDirection: "row", gap: Spacing.three, minHeight: 52 },
  unitNumber: {
    alignItems: "center",
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    justifyContent: "center",
    padding: Spacing.two,
  },
  unitCopy: { flex: 1, gap: Spacing.one },
});
