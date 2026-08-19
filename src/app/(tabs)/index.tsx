import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { api } from '@/../convex/_generated/api';
import { AppScreen } from '@/components/app-screen';
import { DashboardActionCard } from '@/components/dashboard-action-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function OverviewScreen() {
  const shopContext = useQuery(api.shops.getCurrentForUser);

  if (!shopContext || shopContext.membership.status !== 'active') {
    return <DashboardLoadingState />;
  }

  const { membership, shop } = shopContext;
  const roleLabel = formatRole(membership.role);

  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <MaterialCommunityIcons color={Colors.light.primary} name="storefront-outline" size={18} />
          <ThemedText style={styles.eyebrowText} type="smallBold">
            {roleLabel.toUpperCase()} WORKSPACE
          </ThemedText>
        </View>

        <View style={styles.heading}>
          <ThemedText themeColor="textSecondary" type="smallBold">
            WELCOME TO
          </ThemedText>
          <ThemedText style={styles.title} type="title">
            {shop.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Your shop foundation is ready. Start by organizing categories and entering opening
            stock.
          </ThemedText>
        </View>
      </View>

      <View style={styles.shopCard}>
        <View style={styles.cardHeading}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons
              color={Colors.light.primary}
              name="shield-check-outline"
              size={22}
            />
            <ThemedText type="smallBold">Active shop</ThemedText>
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <ThemedText style={styles.activeText} type="smallBold">
              Active
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <ShopDetail icon="account-key-outline" label="Your role" value={roleLabel} />
          <ShopDetail icon="cash-multiple" label="Currency" value={shop.currencyCode} />
          <ShopDetail icon="map-clock-outline" label="Timezone" value={shop.timezone} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="subtitle">Setup readiness</ThemedText>
          <ThemedText themeColor="textSecondary">
            Complete the operational foundation in order so later sales and reports use trustworthy
            data.
          </ThemedText>
        </View>

        <View style={styles.readinessCard}>
          <ReadinessRow
            description="Shop details and owner membership are active."
            icon="check-circle"
            status="Complete"
            title="Shop account"
          />
          <View style={styles.divider} />
          <ReadinessRow
            description="Define categories and enter opening stock."
            icon="arrow-right-circle"
            status="Next"
            title="Inventory foundation"
          />
          <View style={styles.divider} />
          <ReadinessRow
            description="Begin recording sales after inventory exists."
            icon="clock-outline"
            status="After inventory"
            title="Point of sale"
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="subtitle">Next actions</ThemedText>
          <ThemedText themeColor="textSecondary">
            Continue into the existing modules without showing totals that have not been recorded
            yet.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <DashboardActionCard
            description="Create categories and prepare the stock intake workflow."
            emphasis
            href="/inventory"
            icon="package-variant-closed"
            status="Next"
            title="Set up categories and stock"
          />
          <DashboardActionCard
            description="Review how scanning and multi-item sales will work."
            href="/pos"
            icon="qrcode-scan"
            status="Preview"
            title="Preview the sales workflow"
          />
          <DashboardActionCard
            description="Open account controls and see the later operational modules."
            href="/more"
            icon="dots-grid"
            status="Later"
            title="Account and operations"
          />
        </View>
      </View>
    </AppScreen>
  );
}

function DashboardLoadingState() {
  return (
    <AppScreen>
      <View style={styles.loadingState}>
        <ActivityIndicator color={Colors.light.primary} size="large" />
        <ThemedText themeColor="textSecondary">Refreshing your shop dashboard…</ThemedText>
      </View>
    </AppScreen>
  );
}

function ShopDetail({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}>
        <MaterialCommunityIcons color={Colors.light.primary} name={icon} size={20} />
      </View>
      <View style={styles.detailCopy}>
        <ThemedText themeColor="textSecondary" type="small">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
    </View>
  );
}

function ReadinessRow({
  description,
  icon,
  status,
  title,
}: {
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  status: string;
  title: string;
}) {
  const isComplete = status === 'Complete';
  const isNext = status === 'Next';

  return (
    <View style={styles.readinessRow}>
      <MaterialCommunityIcons
        color={isComplete || isNext ? Colors.light.primary : Colors.light.textSecondary}
        name={icon}
        size={24}
      />
      <View style={styles.readinessCopy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {description}
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.readinessStatus, isNext && styles.readinessStatusNext]}
        themeColor={isComplete ? 'primary' : 'textSecondary'}
        type="smallBold">
        {status}
      </ThemedText>
    </View>
  );
}

function formatRole(role: 'cashier' | 'manager' | 'owner') {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'cashier':
      return 'Cashier';
  }
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.four,
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
  heading: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  shopCard: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  activePill: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  activeDot: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.pill,
    height: 7,
    width: 7,
  },
  activeText: {
    color: Colors.light.primary,
    fontSize: 12,
    lineHeight: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  detail: {
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: Radius.medium,
    flexBasis: 180,
    flexDirection: 'row',
    flexGrow: 1,
    gap: Spacing.three,
    minHeight: 72,
    padding: Spacing.three,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  detailCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.four,
  },
  sectionHeading: {
    gap: Spacing.two,
  },
  readinessCard: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.four,
  },
  readinessRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 64,
  },
  readinessCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  readinessStatus: {
    maxWidth: 96,
    textAlign: 'right',
  },
  readinessStatusNext: {
    color: Colors.light.primary,
  },
  divider: {
    backgroundColor: Colors.light.border,
    height: 1,
    marginVertical: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 400,
  },
});
