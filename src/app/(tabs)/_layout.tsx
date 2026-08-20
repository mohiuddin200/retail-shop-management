import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useQuery } from "convex/react";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { api } from "@/../convex/_generated/api";
import { Colors } from "@/constants/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

function TabIcon({ color, name }: { color: ColorValue; name: IconName }) {
  return <MaterialCommunityIcons color={color} name={name} size={24} />;
}

export default function TabLayout() {
  const colors = Colors.light;
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const canAccessInventory =
    shopContext?.membership.status === "active" &&
    shopContext.membership.role !== "cashier";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="view-dashboard-outline" />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="qrcode-scan" />,
        }}
      />
      <Tabs.Protected guard={canAccessInventory}>
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Inventory",
            tabBarIcon: ({ color }) => <TabIcon color={color} name="package-variant-closed" />,
          }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <TabIcon color={color} name="dots-grid" />,
        }}
      />
    </Tabs>
  );
}
