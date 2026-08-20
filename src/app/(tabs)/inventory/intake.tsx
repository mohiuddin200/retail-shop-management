import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppScreen } from "@/components/app-screen";
import {
  InventoryButton,
  InventoryCard,
  InventoryEmpty,
  InventoryField,
  InventoryHeader,
  InventoryLoading,
} from "@/components/inventory-ui";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  dateInTimeZone,
  formatMoney,
  parseMoneyToMinor,
  validateIntakeDate,
} from "@/lib/inventory-domain";

export default function IntakeScreen() {
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const categories = useQuery(api.categories.list, { includeArchived: false });
  const createBatch = useMutation(api.inventory.createBatch);
  const requestKey = useRef(Crypto.randomUUID());
  const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(null);
  const [buyingPrice, setBuyingPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [intakeDate, setIntakeDate] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!shopContext || !categories) {
    return <AppScreen><InventoryLoading /></AppScreen>;
  }

  const today = dateInTimeZone(new Date(), shopContext.shop.timezone);
  const shownDate = intakeDate || today;
  const selectedCategory = categories.find((category) => category._id === categoryId);
  const parsedQuantity = Number(quantity);
  let reviewCost: string | null = null;
  try {
    const unitCost = parseMoneyToMinor(buyingPrice, shopContext.shop.currencyCode);
    if (Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0) {
      reviewCost = formatMoney(unitCost * parsedQuantity, shopContext.shop.currencyCode);
    }
  } catch {
    reviewCost = null;
  }

  const submit = async () => {
    try {
      if (!categoryId) throw new Error("Select a category.");
      const buyingPriceMinor = parseMoneyToMinor(buyingPrice, shopContext.shop.currencyCode);
      if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 500) {
        throw new Error("Quantity must be a whole number between 1 and 500.");
      }
      validateIntakeDate(shownDate, today);
      setSaving(true);
      const result = await createBatch({
        buyingPriceMinor,
        categoryId,
        intakeDate: shownDate,
        notes: notes || undefined,
        quantity: parsedQuantity,
        requestKey: requestKey.current,
        supplierReference: supplierReference || undefined,
      });
      requestKey.current = Crypto.randomUUID();
      Alert.alert(
        "Stock added",
        `${result.quantity} units created. SKUs run from ${result.firstSku} to ${result.lastSku}.`,
        [{ text: "View batch", onPress: () => router.replace({ pathname: "./batches/[batchId]", params: { batchId: result.batchId } }) }],
      );
    } catch (error) {
      Alert.alert("Stock not added", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <InventoryHeader
        description="One immutable batch will be created, with a permanent SKU and fixed buying cost for each unit."
        title="Add stock"
      />

      {categories.length === 0 ? (
        <InventoryCard>
          <InventoryEmpty
            description="An owner must create an active category before stock can be added."
            icon="shape-plus-outline"
            title="Create a category first"
          />
        </InventoryCard>
      ) : (
        <>
          <InventoryCard>
            <ThemedText type="subtitle">1. Choose category</ThemedText>
            <View style={styles.choices}>
              {categories.map((category) => {
                const selected = category._id === categoryId;
                return (
                  <Pressable
                    key={category._id}
                    onPress={() => setCategoryId(category._id)}
                    style={[styles.choice, selected && styles.choiceSelected]}>
                    <ThemedText style={selected ? styles.choiceTextSelected : undefined} type="smallBold">
                      {category.code}
                    </ThemedText>
                    <ThemedText style={selected ? styles.choiceTextSelected : undefined} type="small">
                      {category.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </InventoryCard>

          <InventoryCard>
            <ThemedText type="subtitle">2. Intake details</ThemedText>
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <InventoryField
                  inputMode="decimal"
                  label={`Buying price per unit (${shopContext.shop.currencyCode})`}
                  onChangeText={setBuyingPrice}
                  placeholder="300.00"
                  value={buyingPrice}
                />
              </View>
              <View style={styles.column}>
                <InventoryField
                  inputMode="numeric"
                  label="Quantity (1-500)"
                  maxLength={3}
                  onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))}
                  placeholder="25"
                  value={quantity}
                />
              </View>
            </View>
            <InventoryField
              label="Intake date (YYYY-MM-DD)"
              maxLength={10}
              onChangeText={setIntakeDate}
              placeholder={today}
              value={intakeDate}
            />
            <InventoryField
              label="Supplier or reference (optional)"
              maxLength={100}
              onChangeText={setSupplierReference}
              placeholder="Invoice 1042 or supplier name"
              value={supplierReference}
            />
            <InventoryField
              label="Notes (optional)"
              maxLength={500}
              multiline
              onChangeText={setNotes}
              placeholder="Condition or delivery notes"
              value={notes}
            />
          </InventoryCard>

          <InventoryCard>
            <ThemedText type="subtitle">3. Review</ThemedText>
            <ReviewRow label="Category" value={selectedCategory ? `${selectedCategory.name} (${selectedCategory.code})` : "Not selected"} />
            <ReviewRow label="Units" value={quantity || "0"} />
            <ReviewRow label="Intake date" value={shownDate} />
            <ReviewRow label="Total buying cost" value={reviewCost ?? "Enter a valid price and quantity"} />
            <ThemedText themeColor="textSecondary" type="small">
              After creation, the batch, SKUs, quantity, and buying cost cannot be edited.
            </ThemedText>
            <InventoryButton
              disabled={!categoryId || !buyingPrice || !quantity}
              icon="package-variant-plus"
              label="Create stock batch"
              loading={saving}
              onPress={submit}
            />
          </InventoryCard>
        </>
      )}
    </AppScreen>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <ThemedText themeColor="textSecondary" type="small">{label}</ThemedText>
      <ThemedText style={styles.reviewValue} type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  choice: {
    borderColor: Colors.light.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  choiceSelected: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  choiceTextSelected: { color: Colors.light.surface },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  column: { flexBasis: 220, flexGrow: 1 },
  reviewRow: { flexDirection: "row", gap: Spacing.three, justifyContent: "space-between" },
  reviewValue: { flex: 1, textAlign: "right" },
});
