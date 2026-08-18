import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function FoundationNotice({ isConvexConfigured }: { isConvexConfigured: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons color={Colors.light.primary} name="layers-triple-outline" size={24} />
      </View>
      <View style={styles.content}>
        <ThemedText type="smallBold">Foundation ready</ThemedText>
        <ThemedText style={styles.description} themeColor="textSecondary" type="small">
          Expo Router and the application shell are configured. Convex is{' '}
          {isConvexConfigured
            ? 'connected through the local environment.'
            : 'ready to connect after deployment setup.'}
        </ThemedText>
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
