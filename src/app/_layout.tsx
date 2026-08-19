import { useConvexAuth } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { api } from '@/../convex/_generated/api';
import { isConvexConfigured } from '@/lib/env';
import { ConvexClientProvider } from '@/providers/convex-client-provider';

export default function RootLayout() {
  return (
    <ConvexClientProvider>
      <ThemeProvider value={DefaultTheme}>
        {isConvexConfigured ? <AuthenticatedNavigator /> : <ConfigurationNavigator />}
        <StatusBar style="dark" />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}

function AuthenticatedNavigator() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const shouldLoadShop = !isLoading && isAuthenticated;
  const shopContext = useQuery(
    api.shops.getCurrentForUser,
    shouldLoadShop ? {} : 'skip',
  );

  const isShopLoading = shouldLoadShop && shopContext === undefined;
  const needsOnboarding = shouldLoadShop && shopContext === null;
  const hasActiveMembership = shopContext?.membership.status === 'active';
  const hasUnavailableMembership =
    shopContext !== undefined && shopContext !== null && !hasActiveMembership;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoading}>
        <Stack.Screen name="auth-loading" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoading && !isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={isShopLoading}>
        <Stack.Screen name="shop-loading" />
      </Stack.Protected>

      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={hasUnavailableMembership}>
        <Stack.Screen name="membership-unavailable" />
      </Stack.Protected>

      <Stack.Protected guard={hasActiveMembership}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>

      <Stack.Protected guard={false}>
        <Stack.Screen name="setup-required" />
      </Stack.Protected>
    </Stack>
  );
}

function ConfigurationNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={false}>
        <Stack.Screen name="auth-loading" />
        <Stack.Screen name="shop-loading" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="membership-unavailable" />
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Screen name="setup-required" />
    </Stack>
  );
}
