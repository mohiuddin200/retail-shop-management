import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppScreen } from "@/components/app-screen";
import {
  InventoryCard,
  InventoryField,
  InventoryHeader,
  InventoryLoading,
} from "@/components/inventory-ui";
import { QrCodeSvg } from "@/components/qr-code-svg";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  A4_LABELS_PER_PAGE,
  expandLabelCopies,
  labelPageCount,
  parseLabelRange,
  type LabelUnit,
} from "@/lib/label-printing";

export default function LabelPrintingScreen() {
  const params = useLocalSearchParams<{ batchId: string }>();
  const batchId = params.batchId as Id<"productBatches">;
  const detail = useQuery(api.inventory.getBatch, { batchId });
  const [startValue, setStartValue] = useState("1");
  const [editedEndValue, setEditedEndValue] = useState<string | null>(null);
  const [copies, setCopies] = useState<1 | 2>(1);
  const endValue = editedEndValue ?? String(detail?.batch.quantity ?? "");

  let range: ReturnType<typeof parseLabelRange> | null = null;
  let rangeError: string | null = null;
  if (detail) {
    try {
      range = parseLabelRange(startValue, endValue, detail.batch.quantity);
    } catch (error) {
      rangeError = error instanceof Error ? error.message : "Choose a valid unit range.";
    }
  }

  const labelData = useQuery(
    api.inventory.getLabelData,
    range
      ? {
          batchId,
          endUnit: range.endUnit,
          startUnit: range.startUnit,
        }
      : "skip",
  );

  const previewLabels = useMemo(
    () =>
      labelData
        ? expandLabelCopies(labelData.units, copies).slice(0, A4_LABELS_PER_PAGE)
        : [],
    [copies, labelData],
  );

  if (!detail) {
    return (
      <AppScreen>
        <InventoryLoading />
      </AppScreen>
    );
  }

  const selectedSkus = range?.count ?? 0;
  const totalLabels = selectedSkus * copies;
  const totalPages = labelPageCount("a4", totalLabels);

  return (
    <AppScreen>
      <InventoryHeader
        description="Choose a contiguous unit range. Labels contain only the QR lookup payload, category code, and permanent SKU."
        eyebrow={`BATCH ${String(detail.batch.batchNumber).padStart(4, "0")}`}
        title="Print labels"
      />

      <InventoryCard>
        <ThemedText type="subtitle">1. Select units</ThemedText>
        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <InventoryField
              inputMode="numeric"
              label="Start unit"
              maxLength={3}
              onChangeText={(value) => setStartValue(value.replace(/\D/g, ""))}
              value={startValue}
            />
          </View>
          <View style={styles.column}>
            <InventoryField
              inputMode="numeric"
              label="End unit"
              maxLength={3}
              onChangeText={(value) => setEditedEndValue(value.replace(/\D/g, ""))}
              value={endValue}
            />
          </View>
        </View>
        <ThemedText themeColor="textSecondary" type="small">
          This batch contains {detail.batch.quantity} units. Both endpoints are included.
        </ThemedText>
        {rangeError ? (
          <ThemedText accessibilityRole="alert" style={styles.error} type="smallBold">
            {rangeError}
          </ThemedText>
        ) : null}
      </InventoryCard>

      <InventoryCard>
        <ThemedText type="subtitle">2. Choose copies</ThemedText>
        <View style={styles.choices}>
          {([1, 2] as const).map((value) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: copies === value }}
              key={value}
              onPress={() => setCopies(value)}
              style={[styles.choice, copies === value && styles.choiceSelected]}>
              <ThemedText
                style={copies === value ? styles.choiceTextSelected : undefined}
                type="smallBold">
                {value} {value === 1 ? "copy" : "copies"} per SKU
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText themeColor="textSecondary" type="small">
          Two-copy jobs keep duplicate labels adjacent for each SKU.
        </ThemedText>
      </InventoryCard>

      <InventoryCard>
        <ThemedText type="subtitle">3. Review job</ThemedText>
        <JobRow label="Selected SKUs" value={String(selectedSkus)} />
        <JobRow label="Copies per SKU" value={String(copies)} />
        <JobRow label="Total labels" value={String(totalLabels)} />
        <JobRow label="Estimated A4 pages" value={String(totalPages)} />
        <ThemedText themeColor="textSecondary" type="small">
          A4 uses 48 × 30 mm labels in a 4 × 9 grid. Printing does not update inventory.
        </ThemedText>
      </InventoryCard>

      <View style={styles.previewSection}>
        <View style={styles.previewHeading}>
          <ThemedText type="subtitle">First A4 page preview</ThemedText>
          <ThemedText themeColor="textSecondary">
            Up to 36 labels are rendered here. Remaining pages are generated only when printing.
          </ThemedText>
        </View>
        {!rangeError && labelData === undefined ? (
          <InventoryCard>
            <InventoryLoading />
          </InventoryCard>
        ) : (
          <A4Preview categoryCode={labelData?.category.code ?? ""} labels={previewLabels} />
        )}
      </View>
    </AppScreen>
  );
}

function JobRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.jobRow}>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function A4Preview({
  categoryCode,
  labels,
}: {
  categoryCode: string;
  labels: readonly LabelUnit[];
}) {
  return (
    <View accessibilityLabel="First A4 label sheet preview" style={styles.a4Page}>
      <View style={styles.a4Grid}>
        {Array.from({ length: A4_LABELS_PER_PAGE }, (_, index) => {
          const label = labels[index];
          return (
            <View key={index} style={styles.previewLabel}>
              {label ? (
                <>
                  <View style={styles.previewQr}>
                    <QrCodeSvg height="100%" payload={label.qrPayload} width="100%" />
                  </View>
                  <View style={styles.previewCopy}>
                    <ThemedText numberOfLines={1} style={styles.previewCategory} type="smallBold">
                      {categoryCode}
                    </ThemedText>
                    <ThemedText numberOfLines={3} style={styles.previewSku} type="code">
                      {label.sku}
                    </ThemedText>
                  </View>
                </>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  column: { flexBasis: 180, flexGrow: 1 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  choice: {
    borderColor: Colors.light.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  choiceSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  choiceTextSelected: { color: Colors.light.surface },
  error: { color: "#A23A2A" },
  jobRow: { flexDirection: "row", justifyContent: "space-between" },
  previewSection: { gap: Spacing.four },
  previewHeading: { gap: Spacing.two },
  a4Page: {
    alignItems: "center",
    aspectRatio: 210 / 297,
    backgroundColor: "#FFFFFF",
    borderColor: Colors.light.border,
    borderWidth: 1,
    justifyContent: "center",
    width: "100%",
  },
  a4Grid: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    height: "90.91%",
    width: "91.43%",
  },
  previewLabel: {
    alignItems: "center",
    borderColor: "#707070",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: "11.111%",
    overflow: "hidden",
    padding: "1%",
    width: "25%",
  },
  previewQr: { aspectRatio: 1, height: "92%" },
  previewCopy: { flex: 1, gap: 2, paddingLeft: "2%" },
  previewCategory: { color: "#000000", fontSize: 12, lineHeight: 14 },
  previewSku: { color: "#000000", fontSize: 8, lineHeight: 10 },
});
