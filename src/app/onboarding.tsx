import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/../convex/_generated/api';
import { SignOutButton } from '@/components/sign-out-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

const DEFAULT_CURRENCY = 'BDT';
const DEFAULT_TIMEZONE = 'Asia/Dhaka';

export default function OnboardingScreen() {
  const createInitialShop = useMutation(api.shops.createInitialShop);
  const [name, setName] = useState('');
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedCurrency = currencyCode.trim().toUpperCase();
    const normalizedTimezone = timezone.trim();
    const validationError = validateShop({
      currencyCode: normalizedCurrency,
      name: normalizedName,
      timezone: normalizedTimezone,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createInitialShop({
        currencyCode: normalizedCurrency,
        name: normalizedName,
        timezone: normalizedTimezone,
      });
      setIsFinishing(true);
    } catch (caughtError) {
      setError(getCreationError(caughtError));
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.brandMark}>
                <MaterialCommunityIcons
                  color={Colors.light.primary}
                  name="storefront-plus-outline"
                  size={32}
                />
              </View>

              <View style={styles.heading}>
                <ThemedText style={styles.eyebrow} type="smallBold">
                  OWNER ONBOARDING
                </ThemedText>
                <ThemedText style={styles.title} type="title">
                  Set up your shop.
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  These details establish the shop you will manage and the owner access attached to
                  your account.
                </ThemedText>
              </View>

              <View style={styles.card}>
                <ShopField
                  autoCapitalize="words"
                  label="Shop name"
                  onChangeText={setName}
                  placeholder="Example Fashion House"
                  returnKeyType="next"
                  value={name}
                />

                <ShopField
                  autoCapitalize="characters"
                  label="Currency code"
                  maxLength={3}
                  onChangeText={setCurrencyCode}
                  placeholder={DEFAULT_CURRENCY}
                  returnKeyType="next"
                  supportingText="Use a three-letter code such as BDT, USD, or EUR."
                  value={currencyCode}
                />

                <ShopField
                  autoCapitalize="none"
                  autoCorrect={false}
                  label="Timezone"
                  onChangeText={setTimezone}
                  onSubmitEditing={submit}
                  placeholder={DEFAULT_TIMEZONE}
                  returnKeyType="done"
                  supportingText="Use an IANA timezone such as Asia/Dhaka."
                  value={timezone}
                />

                <View style={styles.notice}>
                  <MaterialCommunityIcons
                    color={Colors.light.primary}
                    name="information-outline"
                    size={20}
                  />
                  <ThemedText style={styles.noticeText} themeColor="textSecondary" type="small">
                    Currency controls money display. Timezone controls future business-day and
                    reporting boundaries.
                  </ThemedText>
                </View>

                {error ? (
                  <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                    <MaterialCommunityIcons color="#A33A32" name="alert-circle-outline" size={20} />
                    <ThemedText style={styles.errorText} type="small">
                      {error}
                    </ThemedText>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={submit}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                    isSubmitting && styles.buttonDisabled,
                  ]}>
                  {isSubmitting ? (
                    <View style={styles.submittingContent}>
                      <ActivityIndicator color={Colors.light.surface} />
                      <ThemedText style={styles.primaryButtonText} type="smallBold">
                        {isFinishing ? 'Finishing setup…' : 'Creating shop…'}
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={styles.primaryButtonText} type="smallBold">
                      Create shop
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              <View style={styles.accountCard}>
                <View style={styles.accountCopy}>
                  <ThemedText type="smallBold">Wrong account?</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Sign out and use the account that should own this shop.
                  </ThemedText>
                </View>
                <SignOutButton />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

type ShopFieldProps = {
  autoCapitalize: 'characters' | 'none' | 'words';
  autoCorrect?: boolean;
  label: string;
  maxLength?: number;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType: 'done' | 'next';
  supportingText?: string;
  value: string;
};

function ShopField({ label, supportingText, ...inputProps }: ShopFieldProps) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        placeholderTextColor={Colors.light.textSecondary}
        style={styles.input}
        {...inputProps}
      />
      {supportingText ? (
        <ThemedText themeColor="textSecondary" type="small">
          {supportingText}
        </ThemedText>
      ) : null}
    </View>
  );
}

function validateShop({
  currencyCode,
  name,
  timezone,
}: {
  currencyCode: string;
  name: string;
  timezone: string;
}) {
  if (!name) {
    return 'Enter your shop name.';
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return 'Currency must be a three-letter code such as BDT.';
  }

  if (!isValidTimeZone(timezone)) {
    return 'Enter a valid IANA timezone such as Asia/Dhaka.';
  }

  return null;
}

function isValidTimeZone(timezone: string) {
  if (!timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function getCreationError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('already belongs')) {
    return 'This account already belongs to a shop. Shop access is being refreshed.';
  }

  if (message.includes('shop name')) {
    return 'Enter your shop name.';
  }

  if (message.includes('currency')) {
    return 'Currency must be a three-letter code such as BDT.';
  }

  if (message.includes('timezone')) {
    return 'Enter a valid IANA timezone such as Asia/Dhaka.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Could not connect. Check your internet connection and try again.';
  }

  return 'We could not create your shop. Please try again.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing.four,
    maxWidth: Math.min(MaxContentWidth, 560),
    width: '100%',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.large,
    height: 68,
    justifyContent: 'center',
    width: 68,
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
  card: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    color: Colors.light.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  noticeText: {
    flex: 1,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FCEBE8',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  errorText: {
    color: '#7E2D27',
    flex: 1,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.medium,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: Colors.light.surface,
  },
  submittingContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
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
