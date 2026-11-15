import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open spending and income overview"
            onPress={() => router.push('/spending-report' as Href)}
            style={({ pressed }) => [styles.financeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.iconBadge}>
              <SymbolView
                name={{ ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' }}
                tintColor={bankGreen}
                size={26}
              />
            </View>

            <View style={styles.buttonCopy}>
              <ThemedText type="smallBold" style={styles.buttonTitle}>
                Spending and income
              </ThemedText>
              <ThemedText type="small" style={styles.buttonDescription}>
                View your category breakdown
              </ThemedText>
            </View>

            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={bankGreen}
              size={20}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open anomaly detection"
            onPress={() => router.push('/anomaly-detection' as Href)}
            style={({ pressed }) => [styles.financeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.iconBadge}>
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                tintColor={bankGreen}
                size={26}
              />
            </View>

            <View style={styles.buttonCopy}>
              <ThemedText type="smallBold" style={styles.buttonTitle}>
                Anomaly detection
              </ThemedText>
              <ThemedText type="small" style={styles.buttonDescription}>
                Review unusual monthly patterns
              </ThemedText>
            </View>

            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={bankGreen}
              size={20}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open savings goal planner"
            onPress={() => router.push('/savings-goal' as Href)}
            style={({ pressed }) => [styles.financeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.iconBadge}>
              <SymbolView
                name={{ ios: 'target', android: 'track_changes', web: 'track_changes' }}
                tintColor={bankGreen}
                size={26}
              />
            </View>

            <View style={styles.buttonCopy}>
              <ThemedText type="smallBold" style={styles.buttonTitle}>
                Savings goal
              </ThemedText>
              <ThemedText type="small" style={styles.buttonDescription}>
                Build a plan from your spending habits
              </ThemedText>
            </View>

            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={bankGreen}
              size={20}
            />
          </Pressable>

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
  buttonDescription: {
    color: '#ffffff',
  },
  financeButton: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
  },
  iconBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#e2f3e8',
  },
  buttonCopy: {
    flex: 1,
    gap: 3,
  },
  buttonTitle: {
    color: bankGreen,
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
