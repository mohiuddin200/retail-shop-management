import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { FoundationNotice } from '@/components/foundation-notice';
import { ModuleCard } from '@/components/module-card';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { coreModules } from '@/constants/modules';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { isConvexConfigured } from '@/lib/env';

export default function OverviewScreen() {
  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <MaterialCommunityIcons color={Colors.light.primary} name="storefront-outline" size={18} />
          <ThemedText style={styles.eyebrowText} type="smallBold">
            RETAIL SHOP MANAGER
          </ThemedText>
        </View>
        <ThemedText style={styles.title} type="title">
          Your shop, clearly accounted for.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Inventory, sales, dues, payroll, and reporting will share one auditable source of truth.
        </ThemedText>
      </View>

      <FoundationNotice isConvexConfigured={isConvexConfigured} />

      <SectionHeader
        description="The SRD modules are mapped into delivery phases. Phase 1 comes first."
        title="Build roadmap"
      />

      <View style={styles.moduleGrid}>
        {coreModules.map((module) => (
          <ModuleCard key={module.key} module={module} />
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  eyebrow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  eyebrowText: {
    color: Colors.light.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  moduleGrid: {
    gap: Spacing.three,
  },
});
