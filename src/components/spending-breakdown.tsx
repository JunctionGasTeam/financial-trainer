import { useRef, useState, type ComponentRef } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Path, Svg } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  monthlyTransactionSummary,
  type MonthlyCategory,
  type MonthlyFlow,
} from '@/data/transaction-summary';
import { useTheme } from '@/hooks/use-theme';

const bankGreen = '#008044';
const emptyFlow: MonthlyFlow = { total: 0, categories: [] };
const latestTransactionMonth = getLatestTransactionMonth();
const monthOptions = createMonthOptions(getCurrentMonthKey());

type PageIndex = 0 | 1;

export function SpendingBreakdown({ onClose }: { onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [activePage, setActivePage] = useState<PageIndex>(0);
  const [selectedMonth, setSelectedMonth] = useState(latestTransactionMonth);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const pagerRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const monthSummary = monthlyTransactionSummary[selectedMonth] ?? {
    spending: emptyFlow,
    income: emptyFlow,
  };
  const monthLabel = formatMonth(selectedMonth);
  const monthMenuHeight = Math.min(280, monthOptions.length * 44);
  const monthMenuTop = safeAreaInsets.top + 56 + 10 + 46 + 6;
  const pages = [
    { key: 'spending', label: 'Spending', centerLabel: 'SPENT', data: monthSummary.spending },
    { key: 'income', label: 'Income', centerLabel: 'RECEIVED', data: monthSummary.income },
  ] as const;

  function selectPage(index: PageIndex) {
    setActivePage(index);
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  }

  function handlePageEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    setActivePage(nextPage === 1 ? 1 : 0);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close spending and income overview"
            hitSlop={12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <Text style={[styles.closeGlyph, { color: theme.text }]}>×</Text>
          </Pressable>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            Spending and income
          </ThemedText>
          <View style={styles.headerBalance} />
        </View>

        <View style={styles.monthPickerWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select month, currently ${monthLabel}`}
            accessibilityState={{ expanded: monthMenuOpen }}
            onPress={() => setMonthMenuOpen((open) => !open)}
            style={[styles.monthPicker, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{monthLabel}</ThemedText>
            <SymbolView
              name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }}
              tintColor={theme.textSecondary}
              size={18}
            />
          </Pressable>
        </View>

        <View style={[styles.segmentedControl, { backgroundColor: theme.backgroundElement }]}>
          {pages.map((page, index) => {
            const selected = activePage === index;
            return (
              <Pressable
                key={page.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => selectPage(index as PageIndex)}
                style={[styles.segment, selected && styles.segmentSelected]}>
                <Text style={[styles.segmentText, { color: selected ? bankGreen : theme.textSecondary }]}>
                  {page.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePageEnd}
          style={styles.pager}>
          {pages.map((page) => (
            <View key={page.key} style={{ width, flex: 1 }}>
              <CategoryPage
                width={width}
                label={page.label}
                centerLabel={page.centerLabel}
                total={page.data.total}
                categories={page.data.categories}
                monthLabel={monthLabel}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={monthMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setMonthMenuOpen(false)}>
        <View style={styles.monthPickerOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close month list"
            onPress={() => setMonthMenuOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <ThemedView
            type="backgroundElement"
            style={[styles.monthMenu, { top: monthMenuTop, height: monthMenuHeight }]}>
            <FlatList
              style={styles.monthOptionsScroll}
              data={monthOptions}
              extraData={selectedMonth}
              keyExtractor={(month) => month}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              renderItem={({ item: month }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: month === selectedMonth }}
                  onPress={() => {
                    setSelectedMonth(month);
                    setMonthMenuOpen(false);
                  }}
                  style={[styles.monthOption, month === selectedMonth && styles.monthOptionSelected]}>
                  <ThemedText type={month === selectedMonth ? 'smallBold' : 'small'}>
                    {formatMonth(month)}
                  </ThemedText>
                </Pressable>
              )}
            />
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

function CategoryPage({
  width,
  label,
  centerLabel,
  total,
  categories,
  monthLabel,
}: {
  width: number;
  label: string;
  centerLabel: string;
  total: number;
  categories: readonly MonthlyCategory[];
  monthLabel: string;
}) {
  const theme = useTheme();
  const chartSize = Math.min(width - 48, 252);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.pageContent}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.periodLabel}>
        Total for {monthLabel}
      </ThemedText>

      <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
        <Svg width={chartSize} height={chartSize} viewBox="0 0 220 220">
          {categories.length === 0 ? (
            <Circle cx={110} cy={110} r={102} fill={theme.backgroundElement} />
          ) : categories.length === 1 ? (
            <Circle cx={110} cy={110} r={102} fill={categories[0].color} />
          ) : (
            categories.map((category, index) => {
              const startAngle = -90 + (categories
                .slice(0, index)
                .reduce((sum, item) => sum + item.amount, 0) / total) * 360;
              const endAngle = startAngle + (category.amount / total) * 360;
              return (
                <Path
                  key={category.category}
                  d={sectorPath(startAngle, endAngle)}
                  fill={category.color}
                  stroke={theme.background}
                  strokeWidth={1.5}
                />
              );
            })
          )}
          <Circle cx={110} cy={110} r={67} fill={theme.background} />
        </Svg>
        <View pointerEvents="none" style={styles.chartCenter}>
          <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>{centerLabel}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.chartTotal, { color: theme.text }]}>
            {formatEuro(total)}
          </Text>
        </View>
      </View>

      <View style={styles.listHeading}>
        <ThemedText type="subtitle" style={styles.listTitle}>
          {label} by category
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.categoryList}>
        {categories.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyMessage}>
            No transactions were recorded in {monthLabel}.
          </ThemedText>
        ) : (
          categories.map((category, index) => (
            <View key={category.category}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />}
              <View style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <ThemedText style={styles.categoryName}>{category.category}</ThemedText>
                <ThemedText type="smallBold" style={styles.categoryAmount}>
                  {formatEuro(category.amount)}
                </ThemedText>
              </View>
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

function sectorPath(startAngle: number, endAngle: number) {
  const center = 110;
  const radius = 102;
  const start = polarPoint(center, radius, startAngle);
  const end = polarPoint(center, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function polarPoint(center: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

function formatEuro(amount: number) {
  return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(amount);
}

function getLatestTransactionMonth() {
  return Object.keys(monthlyTransactionSummary).sort().at(-1) ?? getCurrentMonthKey();
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function createMonthOptions(currentMonth: string) {
  const earliestMonth = Object.keys(monthlyTransactionSummary).sort()[0] ?? currentMonth;
  const [currentYear, currentMonthNumber] = currentMonth.split('-').map(Number);
  const [earliestYear, earliestMonthNumber] = earliestMonth.split('-').map(Number);
  const months: string[] = [];
  let cursor = new Date(currentYear, currentMonthNumber - 1, 1);
  const earliest = new Date(earliestYear, earliestMonthNumber - 1, 1);

  while (cursor >= earliest) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }

  return months;
}

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  closeGlyph: {
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerBalance: {
    width: 38,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    padding: 4,
    borderRadius: 14,
  },
  monthPickerWrap: {
    position: 'relative',
    zIndex: 2,
    marginHorizontal: 20,
    marginTop: 10,
  },
  monthPicker: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  monthMenu: {
    position: 'absolute',
    left: 20,
    right: 20,
    overflow: 'hidden',
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#102719',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  monthOptionsScroll: {
    flex: 1,
  },
  monthOption: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  monthOptionSelected: {
    backgroundColor: '#e2f3e8',
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#102719',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pager: {
    flex: 1,
  },
  pageContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },
  periodLabel: {
    marginBottom: 10,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  chartCenter: {
    position: 'absolute',
    width: '58%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  chartTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  listHeading: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  categoryList: {
    width: '100%',
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  emptyMessage: {
    paddingVertical: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 24,
  },
  categoryRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  categoryDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
  },
  categoryAmount: {
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.75,
  },
});
