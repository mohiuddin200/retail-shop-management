import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function SignOutButton() {
  const { signOut } = useAuthActions();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch {
      setError('Could not sign out. Check your connection and try again.');
      setIsSigningOut(false);
    }
  }

  return (
    <>
      {error ? (
        <ThemedText accessibilityLiveRegion="polite" style={styles.errorText} type="small">
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={handleSignOut}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isSigningOut && styles.buttonDisabled,
        ]}>
        {isSigningOut ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : (
          <ThemedText style={styles.buttonText} type="smallBold">
            Sign out
          </ThemedText>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#7E2D27',
  },
  button: {
    alignItems: 'center',
    borderColor: Colors.light.primary,
    borderRadius: Radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.four,
  },
  buttonText: {
    color: Colors.light.primary,
  },
  buttonPressed: {
    backgroundColor: Colors.light.primaryMuted,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
