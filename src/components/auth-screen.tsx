import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthActions } from '@convex-dev/auth/react';
import { Link } from 'expo-router';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

type AuthMode = 'signIn' | 'signUp';

type AuthScreenProps = {
  mode: AuthMode;
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MINIMUM_PASSWORD_LENGTH = 8;

export function AuthScreen({ mode }: AuthScreenProps) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';
  const title = isSignUp ? 'Create your account.' : 'Welcome back.';
  const description = isSignUp
    ? 'Create a secure account for Retail Shop Manager.'
    : 'Sign in to continue managing your shop.';

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validationError = validateForm({
      confirmation,
      email: normalizedEmail,
      isSignUp,
      password,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('password', {
        email: normalizedEmail,
        flow: mode,
        password,
      });

      if (!result.signingIn) {
        setError('Authentication needs another step that is not configured for this app.');
      }
    } catch (caughtError) {
      setError(getAuthenticationError(caughtError, mode));
    } finally {
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
                  name="storefront-outline"
                  size={30}
                />
              </View>

              <View style={styles.heading}>
                <ThemedText style={styles.eyebrow} type="smallBold">
                  RETAIL SHOP MANAGER
                </ThemedText>
                <ThemedText style={styles.title} type="title">
                  {title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{description}</ThemedText>
              </View>

              <View style={styles.card}>
                <EmailField onChangeText={setEmail} value={email} />

                <PasswordField
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  isVisible={isPasswordVisible}
                  label="Password"
                  onChangeText={setPassword}
                  onSubmitEditing={isSignUp ? undefined : submit}
                  onToggleVisibility={() => setIsPasswordVisible((current) => !current)}
                  textContentType={isSignUp ? 'newPassword' : 'password'}
                  value={password}
                />

                {isSignUp ? (
                  <PasswordField
                    autoComplete="new-password"
                    isVisible={isPasswordVisible}
                    label="Confirm password"
                    onChangeText={setConfirmation}
                    onSubmitEditing={submit}
                    onToggleVisibility={() => setIsPasswordVisible((current) => !current)}
                    textContentType="newPassword"
                    value={confirmation}
                  />
                ) : null}

                {isSignUp ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    Use at least {MINIMUM_PASSWORD_LENGTH} characters.
                  </ThemedText>
                ) : null}

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
                    <ActivityIndicator color={Colors.light.surface} />
                  ) : (
                    <ThemedText style={styles.primaryButtonText} type="smallBold">
                      {isSignUp ? 'Create account' : 'Sign in'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                <ThemedText themeColor="textSecondary" type="small">
                  {isSignUp ? 'Already have an account?' : 'New to Retail Shop Manager?'}
                </ThemedText>
                <Link asChild href={isSignUp ? '/sign-in' : '/sign-up'}>
                  <Pressable accessibilityRole="link">
                    <ThemedText style={styles.switchLink} type="smallBold">
                      {isSignUp ? 'Sign in' : 'Create an account'}
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function EmailField({
  onChangeText,
  value,
}: {
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">Email</ThemedText>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        keyboardType="email-address"
        onChangeText={onChangeText}
        placeholder="owner@example.com"
        placeholderTextColor={Colors.light.textSecondary}
        returnKeyType="next"
        style={styles.input}
        textContentType="emailAddress"
        value={value}
      />
    </View>
  );
}

type PasswordFieldProps = {
  autoComplete: 'current-password' | 'new-password';
  isVisible: boolean;
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  onToggleVisibility: () => void;
  textContentType: 'newPassword' | 'password';
  value: string;
};

function PasswordField({
  isVisible,
  label,
  onToggleVisibility,
  ...inputProps
}: PasswordFieldProps) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter your password"
          placeholderTextColor={Colors.light.textSecondary}
          returnKeyType="done"
          secureTextEntry={!isVisible}
          style={[styles.input, styles.passwordInput]}
          {...inputProps}
        />
        <Pressable
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToggleVisibility}
          style={styles.visibilityButton}>
          <MaterialCommunityIcons
            color={Colors.light.textSecondary}
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
          />
        </Pressable>
      </View>
    </View>
  );
}

function validateForm({
  confirmation,
  email,
  isSignUp,
  password,
}: {
  confirmation: string;
  email: string;
  isSignUp: boolean;
  password: string;
}) {
  if (!EMAIL_PATTERN.test(email)) {
    return 'Enter a valid email address.';
  }

  if (!password) {
    return 'Enter your password.';
  }

  if (isSignUp && password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Password must contain at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
  }

  if (isSignUp && password !== confirmation) {
    return 'Passwords do not match.';
  }

  return null;
}

function getAuthenticationError(error: unknown, mode: AuthMode) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }

  if (message.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'Could not connect. Check your internet connection and try again.';
  }

  return mode === 'signUp'
    ? 'We could not create your account. Please try again.'
    : 'We could not sign you in. Please try again.';
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
    maxWidth: Math.min(MaxContentWidth, 480),
    width: '100%',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.large,
    height: 64,
    justifyContent: 'center',
    width: 64,
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
  passwordInput: {
    paddingRight: 52,
  },
  visibilityButton: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 52,
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
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  switchLink: {
    color: Colors.light.primary,
  },
});
