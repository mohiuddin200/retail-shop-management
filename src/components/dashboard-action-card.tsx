import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type DashboardHref = '/inventory' | '/more' | '/pos';

type DashboardActionCardProps = {
  description: string;
  emphasis?: boolean;
  href: DashboardHref;
  icon: IconName;
  status: string;
  title: string;
};

export function DashboardActionCard({
  description,
  emphasis = false,
  href,
  icon,
  status,
  title,
}: DashboardActionCardProps) {
  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityLabel={`${title}. ${description}`}
        style={({ pressed }) => [
          styles.card,
          emphasis && styles.cardEmphasis,
          pressed && styles.cardPressed,
        ]}>
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, emphasis && styles.iconContainerEmphasis]}>
            <MaterialCommunityIcons
              color={emphasis ? Colors.light.surface : Colors.light.primary}
              name={icon}
              size={24}
            />
          </View>

          <View style={[styles.statusPill, emphasis && styles.statusPillEmphasis]}>
            <ThemedText
              style={[styles.statusText, emphasis && styles.statusTextEmphasis]}
              type="smallBold">
              {status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText style={styles.description} themeColor="textSecondary" type="small">
            {description}
          </ThemedText>
        </View>

        <View style={styles.openRow}>
          <ThemedText style={styles.openText} type="smallBold">
            Open
          </ThemedText>
          <MaterialCommunityIcons color={Colors.light.primary} name="arrow-right" size={20} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    flexBasis: 210,
    flexGrow: 1,
    gap: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 176,
    padding: Spacing.four,
  },
  cardEmphasis: {
    borderColor: Colors.light.primary,
  },
  cardPressed: {
    backgroundColor: Colors.light.primaryMuted,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  iconContainerEmphasis: {
    backgroundColor: Colors.light.primary,
  },
  content: {
    gap: Spacing.two,
  },
  statusPill: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  statusPillEmphasis: {
    backgroundColor: Colors.light.primaryMuted,
  },
  statusText: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  statusTextEmphasis: {
    color: Colors.light.primary,
  },
  description: {
    lineHeight: 20,
  },
  openRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  openText: { color: Colors.light.primary },
});
