import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ModuleDefinition } from '@/constants/modules';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function ModuleCard({ module }: { module: ModuleDefinition }) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons color={Colors.light.primary} name={module.icon} size={22} />
        </View>
        <View style={styles.phasePill}>
          <ThemedText style={styles.phaseText} type="smallBold">
            Phase {module.phase}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="smallBold">{module.title}</ThemedText>
      <ThemedText style={styles.description} themeColor="textSecondary" type="small">
        {module.description}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  phasePill: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  phaseText: {
    color: Colors.light.textSecondary,
  },
  description: {
    lineHeight: 20,
  },
});
