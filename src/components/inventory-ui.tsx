import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors, Radius, Spacing } from "@/constants/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function InventoryHeader({
  description,
  eyebrow = "INVENTORY",
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <ThemedText style={styles.eyebrow} type="smallBold">
        {eyebrow}
      </ThemedText>
      <ThemedText style={styles.title} type="title">
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
    </View>
  );
}

export function InventoryCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function InventoryMetric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons color={Colors.light.primary} name={icon} size={22} />
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
    </View>
  );
}

export function InventoryButton({
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  secondary = false,
}: {
  disabled?: boolean;
  icon?: IconName;
  label: string;
  loading?: boolean;
  onPress?: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={secondary ? Colors.light.primary : Colors.light.surface} />
      ) : (
        <>
          {icon ? (
            <MaterialCommunityIcons
              color={secondary ? Colors.light.primary : Colors.light.surface}
              name={icon}
              size={20}
            />
          ) : null}
          <ThemedText style={secondary ? styles.buttonTextSecondary : styles.buttonText} type="smallBold">
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

export function InventoryField({
  label,
  multiline,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        multiline={multiline}
        placeholderTextColor={Colors.light.textSecondary}
        style={[styles.input, multiline && styles.inputMultiline]}
        {...props}
      />
    </View>
  );
}

export function InventoryEmpty({
  description,
  icon,
  title,
}: {
  description: string;
  icon: IconName;
  title: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons color={Colors.light.primary} name={icon} size={28} />
      </View>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText style={styles.emptyCopy} themeColor="textSecondary" type="small">
        {description}
      </ThemedText>
    </View>
  );
}

export function InventoryLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={Colors.light.primary} size="large" />
      <ThemedText themeColor="textSecondary">Loading inventory...</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, paddingTop: Spacing.two },
  eyebrow: { color: Colors.light.primary, letterSpacing: 1 },
  title: { fontSize: 40, lineHeight: 46 },
  card: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  metric: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    flexBasis: 160,
    flexGrow: 1,
    gap: Spacing.one,
    padding: Spacing.four,
  },
  button: {
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  buttonSecondary: { backgroundColor: Colors.light.surface },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: Colors.light.surface },
  buttonTextSecondary: { color: Colors.light.primary },
  field: { gap: Spacing.two },
  input: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.medium,
    borderWidth: 1,
    color: Colors.light.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: "top" },
  empty: { alignItems: "center", gap: Spacing.two, padding: Spacing.four },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: Radius.pill,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  emptyCopy: { maxWidth: 420, textAlign: "center" },
  loading: { alignItems: "center", gap: Spacing.three, minHeight: 320, justifyContent: "center" },
});
