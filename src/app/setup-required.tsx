import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function SetupRequiredScreen() {
  return (
    <AppScreen>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            color={Colors.light.primary}
            name="database-alert-outline"
            size={36}
          />
        </View>
        <ThemedText style={styles.title} type="title">
          Connect Convex to continue.
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Authentication needs a Convex deployment URL before this app can sign users in.
        </ThemedText>

        <View style={styles.instructions}>
          <ThemedText type="smallBold">Local setup</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Add EXPO_PUBLIC_CONVEX_URL to .env.local, run npm run convex:dev, and restart the
            Expo development server.
          </ThemedText>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
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
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  instructions: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.two,
    padding: Spacing.four,
  },
});
