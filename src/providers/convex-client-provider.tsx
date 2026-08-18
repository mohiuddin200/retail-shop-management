import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { PropsWithChildren } from 'react';

import { convexUrl } from '@/lib/env';

const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, {
      unsavedChangesWarning: false,
    })
  : null;

export function ConvexClientProvider({ children }: PropsWithChildren) {
  if (!convexClient) {
    return children;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
