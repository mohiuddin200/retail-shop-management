import { Stack } from "expo-router";

import { Colors } from "@/constants/theme";

export default function InventoryLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: Colors.light.background },
        headerBackTitle: "Inventory",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: Colors.light.background },
        headerTintColor: Colors.light.primary,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="categories" options={{ title: "Categories" }} />
      <Stack.Screen name="intake" options={{ title: "Add stock" }} />
      <Stack.Screen name="batches/[batchId]" options={{ title: "Batch details" }} />
    </Stack>
  );
}
