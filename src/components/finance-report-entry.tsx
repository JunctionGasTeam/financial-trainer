import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FinanceBento } from '@/components/finance-bento';
import { SafeToSpendCard } from '@/components/safe-to-spend-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const bankGreen = '#008044';

export function FinanceReportEntry() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // iOS native tabs overlay the screen; Android lays content out above the bar.
  const launcherBottom = Platform.OS === 'ios' ? BottomTabInset + insets.bottom : 0;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <SafeToSpendCard />

          <FinanceBento />

          {/* <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open mortgage approval estimator"
            onPress={() => router.push('/mortgage-prediction' as Href)}
            style={({ pressed }) => [styles.financeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.iconBadge}>
              <SymbolView
                name={{ ios: 'house.fill', android: 'home', web: 'home' }}
                tintColor={bankGreen}
                size={26}
              />
            </View>

            <View style={styles.buttonCopy}>
              <ThemedText type="smallBold" style={styles.buttonTitle}>
                Mortgage estimate
              </ThemedText>
              <ThemedText type="small" style={styles.buttonDescription}>
                Estimate approval from historical cases
              </ThemedText>
            </View>

            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={bankGreen}
              size={20}
            />
          </Pressable> */}
        </ScrollView>

        <View style={[styles.launcherDock, { paddingBottom: 10 + launcherBottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open chat with your finance coach"
            onPress={() => router.push('/chat' as Href)}
            style={({ pressed }) => [styles.launcher, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              tintColor={bankGreen}
              size={20}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.launcherText} numberOfLines={1}>
              Ask your coach about your money…
            </ThemedText>
            <View style={styles.launcherSend}>
              <SymbolView
                name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                tintColor="#ffffff"
                size={18}
              />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 14,
  },
  launcherDock: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  launcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  launcherText: {
    flex: 1,
  },
  launcherSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bankGreen,
  },
  pressed: {
    opacity: 0.78,
  },
});
