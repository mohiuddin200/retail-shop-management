import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
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
import { suggestCategoryCode } from "@/lib/inventory-domain";

export default function CategoriesScreen() {
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const categories = useQuery(api.categories.list, { includeArchived: true });
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const setArchived = useMutation(api.categories.setArchived);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!shopContext || !categories) {
    return <AppScreen><InventoryLoading /></AppScreen>;
  }

  const isOwner = shopContext.membership.role === "owner";
  const editing = categories.find((category) => category._id === editingId);

  const reset = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setCodeTouched(false);
  };

  const startEditing = (category: Doc<"categories">) => {
    setEditingId(category._id);
    setName(category.name);
    setCode(category.code);
    setCodeTouched(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) await updateCategory({ categoryId: editingId, code, name });
      else await createCategory({ code, name });
      reset();
    } catch (error) {
      Alert.alert("Category not saved", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleArchived = async (category: Doc<"categories">) => {
    try {
      await setArchived({ archived: category.archivedAt === undefined, categoryId: category._id });
      if (category._id === editingId) reset();
    } catch (error) {
      Alert.alert("Category not updated", error instanceof Error ? error.message : "Try again.");
    }
  };

  return (
    <AppScreen>
      <InventoryHeader
        description={isOwner ? "Codes become part of every unit SKU. Confirm the suggestion before saving." : "These active categories are available when managers add stock."}
        title="Categories"
      />

      {isOwner ? (
        <InventoryCard>
          <ThemedText type="subtitle">{editing ? "Edit category" : "New category"}</ThemedText>
          <InventoryField
            autoCapitalize="words"
            label="Category name"
            onChangeText={(value) => {
              setName(value);
              if (!codeTouched) setCode(suggestCategoryCode(value));
            }}
            placeholder="For example: Men's shirts"
            value={name}
          />
          <InventoryField
            autoCapitalize="characters"
            label="SKU code (2-4 letters or numbers)"
            maxLength={4}
            onChangeText={(value) => {
              setCodeTouched(true);
              setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            }}
            placeholder="SHT"
            value={code}
          />
          <ThemedText themeColor="textSecondary" type="small">
            Suggested from the name, but you must confirm it. Codes cannot change after stock exists.
          </ThemedText>
          <View style={styles.formActions}>
            <InventoryButton
              disabled={name.trim().length < 2 || code.length < 2}
              label={editing ? "Save changes" : "Create category"}
              loading={saving}
              onPress={save}
            />
            {editing ? <InventoryButton label="Cancel" onPress={reset} secondary /> : null}
          </View>
        </InventoryCard>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="subtitle">Shop categories</ThemedText>
        <InventoryCard>
          {categories.length === 0 ? (
            <InventoryEmpty
              description={isOwner ? "Create the first category before adding stock." : "The owner has not created any categories yet."}
              icon="shape-outline"
              title="No categories yet"
            />
          ) : (
            categories.map((category, index) => (
              <View key={category._id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.row}>
                  <View style={[styles.code, category.archivedAt !== undefined && styles.archived]}>
                    <ThemedText style={styles.codeText} type="smallBold">{category.code}</ThemedText>
                  </View>
                  <View style={styles.copy}>
                    <ThemedText type="smallBold">{category.name}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {category.archivedAt === undefined ? "Active for intake" : "Archived"}
                    </ThemedText>
                  </View>
                  {isOwner ? (
                    <View style={styles.rowActions}>
                      <Pressable onPress={() => startEditing(category)}>
                        <ThemedText style={styles.link} type="smallBold">Edit</ThemedText>
                      </Pressable>
                      <Pressable onPress={() => toggleArchived(category)}>
                        <ThemedText style={styles.link} type="smallBold">
                          {category.archivedAt === undefined ? "Archive" : "Reactivate"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </InventoryCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  formActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  section: { gap: Spacing.four },
  divider: { backgroundColor: Colors.light.border, height: 1, marginVertical: Spacing.two },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.three, minHeight: 56 },
  code: {
    alignItems: "center",
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    minWidth: 54,
    padding: Spacing.three,
  },
  archived: { backgroundColor: Colors.light.backgroundElement },
  codeText: { color: Colors.light.primary },
  copy: { flex: 1, gap: Spacing.one },
  rowActions: { alignItems: "flex-end", gap: Spacing.one },
  link: { color: Colors.light.primary },
});
