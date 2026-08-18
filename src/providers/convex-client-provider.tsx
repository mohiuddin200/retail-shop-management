import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { convexUrl } from '@/lib/env';

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, {
      unsavedChangesWarning: false,
    })
  : null;

export function ConvexClientProvider({ children }: PropsWithChildren) {
  if (!convexClient) {
    return children;
  }

  return (
    <ConvexAuthProvider
      client={convexClient}
      storage={
        Platform.OS === 'android' || Platform.OS === 'ios' ? secureStorage : undefined
      }>
      {children}
    </ConvexAuthProvider>
  );
}
