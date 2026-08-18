import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type FeaturePlaceholderProps = {
  icon: IconName;
  phase: string;
  steps: string[];
  summary: string;
  title: string;
};

export function FeaturePlaceholder({ icon, phase, steps, summary, title }: FeaturePlaceholderProps) {
  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons color={Colors.light.primary} name={icon} size={32} />
        </View>
        <ThemedText style={styles.phase} type="smallBold">
          {phase.toUpperCase()}
        </ThemedText>
        <ThemedText style={styles.title} type="title">
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{summary}</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText type="smallBold">Planned workflow</ThemedText>
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText} type="smallBold">
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText style={styles.stepText} themeColor="textSecondary" type="small">
                {step}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.large,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  phase: {
    color: Colors.light.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  steps: {
    gap: Spacing.three,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepNumberText: {
    color: Colors.light.primary,
  },
  stepText: {
    flex: 1,
    lineHeight: 20,
  },
});
