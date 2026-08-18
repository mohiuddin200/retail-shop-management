import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { StyleSheet, View } from 'react-native';

import { api } from '../../convex/_generated/api';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

function ConvexConnectionStatus() {
  const health = useQuery(api.health.check);

  return (
    <ThemedText style={styles.description} themeColor="textSecondary" type="small">
      Convex is {health?.status === 'ok' ? 'connected and responding.' : 'connecting…'}
    </ThemedText>
  );
}

export function FoundationNotice({ isConvexConfigured }: { isConvexConfigured: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons color={Colors.light.primary} name="layers-triple-outline" size={24} />
      </View>
      <View style={styles.content}>
        <ThemedText type="smallBold">Foundation ready</ThemedText>
        {isConvexConfigured ? (
          <ConvexConnectionStatus />
        ) : (
          <ThemedText style={styles.description} themeColor="textSecondary" type="small">
            Add the Convex deployment URL to connect the backend.
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  content: {
    flex: 1,
    gap: Spacing.one,
  },
  description: {
    lineHeight: 20,
  },
});
