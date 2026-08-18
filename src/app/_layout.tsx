import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ConvexClientProvider } from '@/providers/convex-client-provider';

export default function RootLayout() {
  return (
    <ConvexClientProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
