import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const bankGreen = '#008044';

export function FinanceReportEntry() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>
            YOUR FINANCES
          </ThemedText>

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
              <ThemedText type="small" themeColor="textSecondary">
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
              <ThemedText type="small" themeColor="textSecondary">
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
              <ThemedText type="small" themeColor="textSecondary">
                Build a plan from your spending habits
              </ThemedText>
            </View>

            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={bankGreen}
              size={20}
            />
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 14,
  },
  eyebrow: {
    letterSpacing: 1,
    paddingHorizontal: 4,
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
  pressed: {
    opacity: 0.78,
  },
});
