import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useQuery } from "convex/react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";

import { api } from "@/../convex/_generated/api";
import { AppScreen } from "@/components/app-screen";
import { DashboardActionCard } from "@/components/dashboard-action-card";
import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { formatMoney } from "@/lib/inventory-domain";
import { buildOverviewSnapshot } from "@/lib/overview-domain";

const overviewImage = require("../../../assets/images/overview-retail-operations.png");

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
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrow}>
            <MaterialCommunityIcons
              color={Colors.light.primary}
              name="storefront-outline"
              size={18}
            />
            <ThemedText style={styles.eyebrowText} type="smallBold">
              {roleLabel.toUpperCase()} WORKSPACE
            </ThemedText>
          </View>

          <View style={styles.heading}>
            <ThemedText themeColor="textSecondary" type="smallBold">
              WELCOME BACK
            </ThemedText>
            <ThemedText style={styles.title} type="title">
              {shop.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {isCashier
                ? "Scan products, complete cash sales, and process customer returns from one workspace."
                : "Monitor the current business day, manage stock, and keep every sale and return connected to permanent inventory."}
            </ThemedText>
          </View>

          <View style={styles.shopMeta}>
            <MetaPill icon="account-key-outline" label={roleLabel} />
            <MetaPill icon="cash-multiple" label={shop.currencyCode} />
            <MetaPill icon="map-clock-outline" label={shop.timezone} />
          </View>

          <Link asChild href="/pos">
            <Pressable
              accessibilityLabel="Open point of sale"
              style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
              <MaterialCommunityIcons
                color={Colors.light.surface}
                name="qrcode-scan"
                size={22}
              />
              <ThemedText style={styles.primaryActionText} type="smallBold">
                Open POS
              </ThemedText>
              <MaterialCommunityIcons
                color={Colors.light.surface}
                name="arrow-right"
                size={20}
              />
            </Pressable>
          </Link>
        </View>

        <View style={styles.heroMedia}>
          <Image
            accessibilityLabel="Shop worker scanning a product label at an organized clothing store counter"
            accessible
            resizeMode="cover"
            source={overviewImage}
            style={styles.heroImage}
          />
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <ThemedText style={styles.activeText} type="smallBold">
              ACTIVE SHOP
            </ThemedText>
          </View>
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
            description="Scan SKUs, build a cart, take cash, and process exact-price returns."
            emphasis
            href="/pos"
            icon="qrcode-scan"
            status="Ready"
            title="Open point of sale"
          />
          {!isCashier ? (
            <DashboardActionCard
              description="Create categories, add stock, review batches, and print unit labels."
              href="/inventory"
              icon="package-variant-closed"
              status="Live"
              title="Manage inventory"
            />
          ) : null}
          <DashboardActionCard
            description="Open account controls and see reporting and later operational modules."
            href="/more"
            icon="chart-box-outline"
            status="Upcoming"
            title="Operations and reports"
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
  heroCard: {
    backgroundColor: "#EAF2EC",
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.four,
    overflow: "hidden",
    padding: Spacing.four,
  },
  heroCopy: {
    flexBasis: 300,
    flexGrow: 1,
    gap: Spacing.four,
    justifyContent: "center",
    minWidth: 0,
  },
  eyebrow: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.pill,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  eyebrowText: { color: Colors.light.primary, letterSpacing: 0.8 },
  heading: { gap: Spacing.two },
  title: { fontSize: 38, lineHeight: 44 },
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
  primaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  primaryActionText: { color: Colors.light.surface },
  heroMedia: {
    flexBasis: 320,
    flexGrow: 1,
    justifyContent: "center",
    minWidth: 0,
    position: "relative",
  },
  heroImage: {
    aspectRatio: 3 / 2,
    borderRadius: Radius.medium,
    width: "100%",
  },
  activeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: Radius.pill,
    bottom: Spacing.three,
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    position: "absolute",
    right: Spacing.three,
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
  actions: { gap: Spacing.three },
  pressed: { opacity: 0.78 },
  loadingState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.three,
    justifyContent: "center",
    minHeight: 400,
  },
});
