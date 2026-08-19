import { StyleSheet, View } from 'react-native';

import { FeaturePlaceholder } from '@/components/feature-placeholder';
import { SignOutButton } from '@/components/sign-out-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function MoreScreen() {
  return (
    <FeaturePlaceholder
      icon="dots-grid"
      phase="Phases 2–3"
      steps={[
        'Stock audits and gap reconciliation',
        'Credit-buyer balances and payments',
        'Staff payroll and withdrawals',
        'Expenses, reports, exports, and owner settings',
      ]}
      summary="Supporting modules will build on the same transaction and permission foundations."
      title="Operations and reports">
      <View style={styles.accountCard}>
        <View style={styles.accountCopy}>
          <ThemedText type="smallBold">Account</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Your session is stored securely on this device.
          </ThemedText>
        </View>
        <SignOutButton />
      </View>
    </FeaturePlaceholder>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  accountCopy: {
    gap: Spacing.one,
  },
});
