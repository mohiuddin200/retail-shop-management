import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppScreen } from "@/components/app-screen";
import {
  InventoryButton,
  InventoryCard,
  InventoryField,
  InventoryHeader,
  InventoryLoading,
} from "@/components/inventory-ui";
import { QrCodeSvg } from "@/components/qr-code-svg";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  labelActionError,
  printLabelHtml,
  shareLabelPdf,
} from "@/lib/label-platform";
import {
  A4_LABELS_PER_PAGE,
  buildLabelHtml,
  expandLabelCopies,
  labelPageCount,
  parseLabelRange,
  type LabelFormat,
  type LabelUnit,
} from "@/lib/label-printing";

export default function LabelPrintingScreen() {
  const params = useLocalSearchParams<{ batchId: string }>();
  const batchId = params.batchId as Id<"productBatches">;
  const detail = useQuery(api.inventory.getBatch, { batchId });
  const [startValue, setStartValue] = useState("1");
  const [editedEndValue, setEditedEndValue] = useState<string | null>(null);
  const [copies, setCopies] = useState<1 | 2>(1);
  const [format, setFormat] = useState<LabelFormat>("a4");
  const [thermalPreviewIndex, setThermalPreviewIndex] = useState(0);
  const [activeAction, setActiveAction] = useState<"pdf" | "print" | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
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

  const jobLabels = useMemo(
    () => (labelData ? expandLabelCopies(labelData.units, copies) : []),
    [copies, labelData],
  );
  const previewLabels = jobLabels.slice(0, A4_LABELS_PER_PAGE);

  const runLabelAction = async (action: "pdf" | "print") => {
    if (!labelData || jobLabels.length === 0) {
      return;
    }

    setActiveAction(action);
    setGenerationProgress(0);
    try {
      const html = await buildLabelHtml(format, {
        categoryCode: labelData.category.code,
        documentTitle: `${labelData.shop.name} batch ${labelData.batch.batchNumber} labels`,
        labels: jobLabels,
        onProgress: (completed, total) =>
          setGenerationProgress(Math.round((completed / total) * 100)),
      });

      if (action === "print") {
        await printLabelHtml(html, format);
      } else {
        await shareLabelPdf(html, format);
      }
    } catch (error) {
      Alert.alert(
        action === "print" ? "Labels not printed" : "PDF not shared",
        labelActionError(error),
      );
    } finally {
      setActiveAction(null);
      setGenerationProgress(0);
    }
  };

  if (!detail) {
    return (
      <AppScreen>
        <InventoryLoading />
      </AppScreen>
    );
  }

  const selectedSkus = range?.count ?? 0;
  const totalLabels = selectedSkus * copies;
  const totalPages = labelPageCount(format, totalLabels);
  const shownThermalIndex = Math.min(thermalPreviewIndex, Math.max(jobLabels.length - 1, 0));

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
        <ThemedText type="subtitle">3. Choose format</ThemedText>
        <View style={styles.formatChoices}>
          {([
            {
              description: "48 × 30 mm cells, 4 columns × 9 rows",
              title: "A4 cut sheet",
              value: "a4",
            },
            {
              description: "One 40 × 30 mm label per page",
              title: "Thermal roll",
              value: "thermal",
            },
          ] as const).map((option) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: format === option.value }}
              key={option.value}
              onPress={() => {
                setFormat(option.value);
                setThermalPreviewIndex(0);
              }}
              style={[
                styles.formatChoice,
                format === option.value && styles.choiceSelected,
              ]}>
              <ThemedText
                style={format === option.value ? styles.choiceTextSelected : undefined}
                type="smallBold">
                {option.title}
              </ThemedText>
              <ThemedText
                style={format === option.value ? styles.choiceTextSelected : undefined}
                type="small">
                {option.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </InventoryCard>

      <InventoryCard>
        <ThemedText type="subtitle">4. Review job</ThemedText>
        <JobRow label="Selected SKUs" value={String(selectedSkus)} />
        <JobRow label="Copies per SKU" value={String(copies)} />
        <JobRow label="Total labels" value={String(totalLabels)} />
        <JobRow label="Estimated pages" value={String(totalPages)} />
        <ThemedText themeColor="textSecondary" type="small">
          {format === "a4"
            ? "A4 uses 48 × 30 mm labels in a 4 × 9 grid."
            : "Thermal uses one 40 × 30 mm label per page with a 1 mm safety margin."}{" "}
          Printing does not update inventory.
        </ThemedText>
      </InventoryCard>

      <View style={styles.previewSection}>
        <View style={styles.previewHeading}>
          <ThemedText type="subtitle">
            {format === "a4" ? "First A4 page preview" : "Thermal label preview"}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {format === "a4"
              ? "Up to 36 labels are rendered here. Remaining pages are generated only when printing."
              : "Only one label is rendered at a time to keep large jobs responsive."}
          </ThemedText>
        </View>
        {!rangeError && labelData === undefined ? (
          <InventoryCard>
            <InventoryLoading />
          </InventoryCard>
        ) : format === "a4" ? (
          <A4Preview categoryCode={labelData?.category.code ?? ""} labels={previewLabels} />
        ) : (
          <ThermalPreview
            categoryCode={labelData?.category.code ?? ""}
            index={shownThermalIndex}
            label={jobLabels[shownThermalIndex]}
            onNext={() =>
              setThermalPreviewIndex(
                Math.min(shownThermalIndex + 1, Math.max(jobLabels.length - 1, 0)),
              )
            }
            onPrevious={() => setThermalPreviewIndex(Math.max(shownThermalIndex - 1, 0))}
            total={jobLabels.length}
          />
        )}
      </View>

      <InventoryCard>
        <ThemedText type="subtitle">5. Print or export</ThemedText>
        {activeAction ? (
          <ThemedText accessibilityRole="alert" themeColor="textSecondary" type="small">
            {generationProgress < 100
              ? `Generating labels… ${generationProgress}%`
              : activeAction === "print"
                ? "Opening the system print dialog…"
                : "Creating and opening the PDF share sheet…"}
          </ThemedText>
        ) : null}
        <InventoryButton
          disabled={!labelData || Boolean(rangeError) || activeAction !== null}
          icon="printer-outline"
          label="Open system print dialog"
          loading={activeAction === "print"}
          onPress={() => runLabelAction("print")}
        />
        {Platform.OS !== "web" ? (
          <InventoryButton
            disabled={!labelData || Boolean(rangeError) || activeAction !== null}
            icon="file-pdf-box"
            label="Create and share PDF"
            loading={activeAction === "pdf"}
            onPress={() => runLabelAction("pdf")}
            secondary
          />
        ) : null}
      </InventoryCard>
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

function ThermalPreview({
  categoryCode,
  index,
  label,
  onNext,
  onPrevious,
  total,
}: {
  categoryCode: string;
  index: number;
  label: LabelUnit | undefined;
  onNext: () => void;
  onPrevious: () => void;
  total: number;
}) {
  return (
    <View style={styles.thermalPreviewArea}>
      <View accessibilityLabel="40 by 30 millimetre thermal label preview" style={styles.thermalLabel}>
        {label ? (
          <>
            <View style={styles.thermalQr}>
              <QrCodeSvg height="100%" payload={label.qrPayload} width="100%" />
            </View>
            <View style={styles.thermalCopy}>
              <ThemedText style={styles.thermalCategory} type="smallBold">
                {categoryCode}
              </ThemedText>
              <ThemedText style={styles.thermalSku} type="code">
                {label.sku}
              </ThemedText>
            </View>
          </>
        ) : null}
      </View>
      <View style={styles.thermalControls}>
        <Pressable
          accessibilityRole="button"
          disabled={index === 0 || total === 0}
          onPress={onPrevious}
          style={[styles.navButton, (index === 0 || total === 0) && styles.navButtonDisabled]}>
          <ThemedText style={styles.navButtonText} type="smallBold">
            Previous
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold">
          Label {total === 0 ? 0 : index + 1} of {total}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          disabled={total === 0 || index >= total - 1}
          onPress={onNext}
          style={[
            styles.navButton,
            (total === 0 || index >= total - 1) && styles.navButtonDisabled,
          ]}>
          <ThemedText style={styles.navButtonText} type="smallBold">
            Next
          </ThemedText>
        </Pressable>
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
  formatChoices: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  formatChoice: {
    borderColor: Colors.light.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexBasis: 240,
    flexGrow: 1,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  thermalPreviewArea: { alignItems: "center", gap: Spacing.three },
  thermalLabel: {
    alignItems: "center",
    aspectRatio: 40 / 30,
    backgroundColor: "#FFFFFF",
    borderColor: Colors.light.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.three,
    maxWidth: 440,
    padding: Spacing.three,
    width: "100%",
  },
  thermalQr: { aspectRatio: 1, width: "56%" },
  thermalCopy: { flex: 1, gap: Spacing.two },
  thermalCategory: { color: "#000000", fontSize: 28, lineHeight: 32 },
  thermalSku: { color: "#000000", fontSize: 13, lineHeight: 17 },
  thermalControls: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
    justifyContent: "center",
  },
  navButton: {
    borderColor: Colors.light.primary,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  navButtonDisabled: { opacity: 0.4 },
  navButtonText: { color: Colors.light.primary },
});
