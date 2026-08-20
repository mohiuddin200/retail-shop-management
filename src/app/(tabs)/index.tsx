import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import { AppScreen } from "@/components/app-screen";
import { DashboardActionCard } from "@/components/dashboard-action-card";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { formatMoney } from "@/lib/inventory-domain";
import { buildOverviewSnapshot } from "@/lib/overview-domain";

export default function OverviewScreen() {
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const hasActiveShop = shopContext?.membership.status === "active";
  const isCashier = shopContext?.membership.role === "cashier";
  const currentDay = useQuery(
    api.pos.getCurrentBusinessDay,
    hasActiveShop ? {} : "skip",
  );
  const inventorySummary = useQuery(
    api.inventory.getSummary,
    hasActiveShop && !isCashier ? {} : "skip",
  );

  if (
    !shopContext ||
    !hasActiveShop ||
    currentDay === undefined ||
    (!isCashier && inventorySummary === undefined)
  ) {
    return <DashboardLoadingState />;
  }

  const { membership, shop } = shopContext;
  const roleLabel = formatRole(membership.role);
  const snapshot = buildOverviewSnapshot({
    currentDay,
    inventorySummary: inventorySummary ?? null,
    role: membership.role,
  });

  return (
    <AppScreen>
      <View style={styles.pageHeader}>
        <View style={styles.headerRow}>
          <View style={styles.heading}>
            <View style={styles.eyebrow}>
              <MaterialCommunityIcons
                color={Colors.light.primary}
                name="storefront-outline"
                size={18}
              />
              <ThemedText style={styles.eyebrowText} type="smallBold">
                OVERVIEW
              </ThemedText>
            </View>
            <ThemedText style={styles.title} type="title">
              {shop.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {isCashier
                ? "Your sales workspace and current business-day activity."
                : "Today’s sales, returns, and inventory position in one place."}
            </ThemedText>
          </View>

          <View style={styles.activeShopPill}>
            <View style={styles.activeDot} />
            <ThemedText style={styles.activeText} type="smallBold">
              ACTIVE SHOP
            </ThemedText>
          </View>
        </View>

        <View style={styles.shopMeta}>
          <MetaPill icon="account-key-outline" label={roleLabel} />
          <MetaPill icon="cash-multiple" label={shop.currencyCode} />
          <MetaPill icon="map-clock-outline" label={shop.timezone} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionHeading}>
            <ThemedText type="subtitle">Current business day</ThemedText>
            <ThemedText themeColor="textSecondary">
              {currentDay
                ? "Sales and returns stay grouped until an owner or manager ends this explicit day."
                : "The first business day opens automatically when the first sale is completed."}
            </ThemedText>
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                snapshot.businessDay.statusLabel !== "Open" && styles.statusDotIdle,
              ]}
            />
            <ThemedText style={styles.statusText} type="smallBold">
              {snapshot.businessDay.dayLabel} · {snapshot.businessDay.statusLabel}
            </ThemedText>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            detail={`${snapshot.businessDay.unitCount} products sold`}
            icon="receipt-text-outline"
            label="Activity"
            value={`${snapshot.businessDay.saleCount} sales`}
          />
          <MetricCard
            icon="cash-plus"
            label="Gross sales"
            value={formatMoney(snapshot.businessDay.grossSalesMinor, shop.currencyCode)}
          />
          <MetricCard
            detail={`${snapshot.businessDay.returnCount} returns`}
            icon="cash-refund"
            label="Refunded"
            value={formatMoney(snapshot.businessDay.refundAmountMinor, shop.currencyCode)}
          />
          <MetricCard
            icon="cash-check"
            label="Net cash"
            value={formatMoney(snapshot.businessDay.netCashMinor, shop.currencyCode)}
          />
        </View>
      </View>

      {snapshot.inventory ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <ThemedText type="subtitle">Inventory snapshot</ThemedText>
            <ThemedText themeColor="textSecondary">
              Current sellable stock and its original recorded buying cost.
            </ThemedText>
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard
              icon="package-variant"
              label="Units in stock"
              value={String(snapshot.inventory.inStockUnitCount)}
            />
            <MetricCard
              icon="cash-multiple"
              label="Stock cost"
              value={formatMoney(snapshot.inventory.inStockCostMinor, shop.currencyCode)}
            />
            <MetricCard
              icon="shape-outline"
              label="Active categories"
              value={String(snapshot.inventory.activeCategoryCount)}
            />
            <MetricCard
              icon="layers-triple-outline"
              label="Intake batches"
              value={String(snapshot.inventory.batchCount)}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText type="subtitle">Quick actions</ThemedText>
          <ThemedText themeColor="textSecondary">
            Continue directly into the operational modules available to your role.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <DashboardActionCard
            description="Sell by QR and process returns."
            emphasis
            href="/pos"
            icon="qrcode-scan"
            status="Ready"
            title="Point of sale"
          />
          {!isCashier ? (
            <DashboardActionCard
              description="Manage categories, stock, and labels."
              href="/inventory"
              icon="package-variant-closed"
              status="Live"
              title="Inventory"
            />
          ) : null}
          <DashboardActionCard
            description="Account controls and future reports."
            href="/more"
            icon="chart-box-outline"
            status="Upcoming"
            title="Operations"
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
        <ThemedText themeColor="textSecondary">Refreshing your shop overview…</ThemedText>
      </View>
    </AppScreen>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
}) {
  return (
    <View style={styles.metaPill}>
      <MaterialCommunityIcons color={Colors.light.primary} name={icon} size={17} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </View>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
}: {
  detail?: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <MaterialCommunityIcons color={Colors.light.primary} name={icon} size={21} />
      </View>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
      <ThemedText style={styles.metricValue} type="subtitle">
        {value}
      </ThemedText>
      {detail ? (
        <ThemedText themeColor="textSecondary" type="small">
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}

function formatRole(role: "cashier" | "manager" | "owner") {
  switch (role) {
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "cashier":
      return "Cashier";
  }
}

const styles = StyleSheet.create({
  pageHeader: { gap: Spacing.three },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  eyebrow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  eyebrowText: { color: Colors.light.primary, letterSpacing: 0.8 },
  heading: {
    flexBasis: 280,
    flexGrow: 1,
    gap: Spacing.two,
    minWidth: 0,
  },
  title: { fontSize: 32, lineHeight: 38 },
  shopMeta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  metaPill: {
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  activeShopPill: {
    alignItems: "center",
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  activeDot: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.pill,
    height: 7,
    width: 7,
  },
  activeText: { color: Colors.light.primary, fontSize: 11, lineHeight: 14 },
  section: { gap: Spacing.four },
  sectionHeading: { flex: 1, gap: Spacing.two },
  sectionTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  statusDot: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.pill,
    height: 8,
    width: 8,
  },
  statusDotIdle: { backgroundColor: Colors.light.textSecondary },
  statusText: { color: Colors.light.primary },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  metricCard: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    flexBasis: 160,
    flexGrow: 1,
    gap: Spacing.one,
    minHeight: 142,
    padding: Spacing.four,
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    height: 40,
    justifyContent: "center",
    marginBottom: Spacing.one,
    width: 40,
  },
  metricValue: { fontSize: 21, lineHeight: 27 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.three,
    justifyContent: "center",
    minHeight: 400,
  },
});
