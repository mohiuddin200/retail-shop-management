import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ color, name }: { color: ColorValue; name: IconName }) {
  return <MaterialCommunityIcons color={color} name={name} size={24} />;
}

export default function TabLayout() {
  const colors = Colors.light;

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
          title: 'Overview',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="view-dashboard-outline" />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'POS',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="qrcode-scan" />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="package-variant-closed" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="dots-grid" />,
        }}
      />
    </Tabs>
  );
}
