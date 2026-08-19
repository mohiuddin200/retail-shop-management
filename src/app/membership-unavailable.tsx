import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/../convex/_generated/api';
import { AppScreen } from '@/components/app-screen';
import { SignOutButton } from '@/components/sign-out-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function MembershipUnavailableScreen() {
  const shopContext = useQuery(api.shops.getCurrentForUser);
  const status = shopContext?.membership.status;
  const isInvited = status === 'invited';

  return (
    <AppScreen>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            color={Colors.light.primary}
            name={isInvited ? 'email-lock-outline' : 'account-lock-outline'}
            size={36}
          />
        </View>

        <View style={styles.heading}>
          <ThemedText style={styles.eyebrow} type="smallBold">
            SHOP ACCESS
          </ThemedText>
          <ThemedText style={styles.title} type="title">
            {isInvited ? 'Your invitation is not active yet.' : 'Your shop access is disabled.'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {isInvited
              ? 'Ask the shop owner to activate your membership before signing in again.'
              : 'Ask the shop owner to restore your membership before signing in again.'}
          </ThemedText>
        </View>

        {shopContext?.shop ? (
          <View style={styles.shopCard}>
            <ThemedText type="smallBold">{shopContext.shop.name}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Membership status: {status ?? 'checking'}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actionCard}>
          <ThemedText type="smallBold">Use another account</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Sign out if a different account already has active shop access.
          </ThemedText>
          <SignOutButton />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingTop: Spacing.six,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.large,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  heading: {
    gap: Spacing.two,
  },
  eyebrow: {
    color: Colors.light.primary,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  shopCard: {
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.large,
    gap: Spacing.one,
    padding: Spacing.four,
  },
  actionCard: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
