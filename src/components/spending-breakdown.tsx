import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ActivityIndicator,
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
  getSpendingClassificationData,
  getMonthlyTransactionSummary,
  getTransactionMonthRange,
  type MonthlyTransactionSummary,
  type MonthlyCategory,
  type TransactionMonthRange,
} from '@/data/transactions';
import { classifySpendingTransactions, type SpendingType } from '@/features/spending/api';
import { useTheme } from '@/hooks/use-theme';

const bankGreen = '#008044';
const emptySummary: MonthlyTransactionSummary = {
  spending: { total: 0, categories: [] },
  income: { total: 0, categories: [] },
};

type PageIndex = 0 | 1;
type DiagramCategory = MonthlyCategory & { details?: MonthlyCategory[] };

export function SpendingBreakdown({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [activePage, setActivePage] = useState<PageIndex>(0);
  const [monthRange, setMonthRange] = useState<TransactionMonthRange | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loadedMonth, setLoadedMonth] = useState('');
  const [monthSummary, setMonthSummary] = useState(emptySummary);
  const [spendingGroups, setSpendingGroups] = useState<DiagramCategory[]>([]);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const pagerRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const monthOptions = useMemo(
    () => createMonthOptions(monthRange?.firstMonth, getCurrentMonthKey()),
    [monthRange],
  );
  const monthLabel = selectedMonth ? formatMonth(selectedMonth) : 'Loading months…';
  const monthMenuHeight = Math.min(280, monthOptions.length * 44);
  const monthMenuTop = safeAreaInsets.top + 72 + 10 + 46 + 6;
  const loadingSummary = !loadError && (!selectedMonth || loadedMonth !== selectedMonth);
  const pages = [
    {
      key: 'spending', label: 'Spending', listHeading: 'Spending by type', centerLabel: 'SPENT',
      total: spendingGroups.reduce((sum, group) => sum + group.amount, 0), categories: spendingGroups,
    },
    {
      key: 'income', label: 'Income', listHeading: 'Income by category', centerLabel: 'RECEIVED',
      total: monthSummary.income.total, categories: monthSummary.income.categories,
    },
  ] as const;

  useEffect(() => {
    let active = true;
    getTransactionMonthRange(db).then((range) => {
      if (!active) return;
      setMonthRange(range);
      if (range) {
        setSelectedMonth(range.lastMonth);
      } else {
        setLoadError('No transactions are available for this customer.');
      }
    }).catch(() => {
      if (active) {
        setLoadError('Could not load transactions from the SQLite database.');
      }
    });
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    if (!selectedMonth) return;
    let active = true;
    async function loadSelectedMonth() {
      try {
        const [summary, classificationData] = await Promise.all([
          getMonthlyTransactionSummary(db, selectedMonth),
          getSpendingClassificationData(db, selectedMonth),
        ]);
        const classifications = classificationData.transactions.length > 0
          ? await classifySpendingTransactions(classificationData.transactions, classificationData.categoryHistory)
          : [];
        const groups = buildSpendingGroups(classificationData.transactions, classifications);
        if (!active) return;
        setMonthSummary(summary);
        setSpendingGroups(groups);
        setLoadedMonth(selectedMonth);
        setLoadError('');
      } catch (cause) {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'Could not load and classify this month.');
      }
    }
    void loadSelectedMonth();
    return () => { active = false; };
  }, [db, selectedMonth, loadAttempt]);

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

        {loadingSummary ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={bankGreen} />
            <ThemedText type="small" themeColor="textSecondary">{loadError || 'Loading transactions and classifying spending with Gemini…'}</ThemedText>
          </View>
        ) : loadError ? (
          <View style={styles.loadingState}>
            <ThemedText type="small" themeColor="textSecondary">{loadError}</ThemedText>
            {selectedMonth ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setLoadError('');
                  setLoadedMonth('');
                  setLoadAttempt((attempt) => attempt + 1);
                }}
                style={styles.retryButton}>
                <ThemedText type="smallBold" style={styles.retryText}>Try again</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
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
                  listHeading={page.listHeading}
                  centerLabel={page.centerLabel}
                  total={page.total}
                  categories={page.categories}
                  monthLabel={monthLabel}
                />
              </View>
            ))}
          </ScrollView>
        )}
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
                    setLoadError('');
                    setLoadedMonth('');
                    setSelectedMonth(month);
                    setLoadAttempt((attempt) => attempt + 1);
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
  listHeading,
  centerLabel,
  total,
  categories,
  monthLabel,
}: {
  width: number;
  label: string;
  listHeading: string;
  centerLabel: string;
  total: number;
  categories: readonly DiagramCategory[];
  monthLabel: string;
}) {
  const theme = useTheme();
  const chartSize = Math.min(width - 48, 252);
  const visibleCategories = categories.filter((category) => category.amount > 0);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.pageContent}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.periodLabel}>
        Total for {monthLabel}
      </ThemedText>

      <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
        <Svg width={chartSize} height={chartSize} viewBox="0 0 220 220">
          {visibleCategories.length === 0 ? (
            <Circle cx={110} cy={110} r={102} fill={theme.backgroundElement} />
          ) : visibleCategories.length === 1 ? (
            <Circle cx={110} cy={110} r={102} fill={visibleCategories[0].color} />
          ) : (
            visibleCategories.map((category, index) => {
              const startAngle = -90 + (visibleCategories
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
          {listHeading}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {label === 'Spending' ? '3 spending types' : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`}
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
              {category.details ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.categoryDetails}>
                  {category.details.length > 0
                    ? category.details.map((detail) => `${detail.category} ${formatEuro(detail.amount)}`).join(' · ')
                    : 'No transactions recorded in this type.'}
                </ThemedText>
              ) : null}
            </View>
          ))
        )}
      </ThemedView>
    </ScrollView>
  );
}

const spendingTypeDefinitions: { type: SpendingType; category: string; color: string }[] = [
    {
      type: 'mandatory_regular',
      category: 'Mandatory & regular',
      color: '#008044',
    },
    {
      type: 'mandatory_irregular',
      category: 'Mandatory & irregular',
      color: '#5c8db0',
    },
    {
      type: 'everyday_flexible',
      category: 'Everyday spending that slips through your fingers',
      color: '#d5a338',
    },
  ];

function buildSpendingGroups(
  transactions: { transactionId: number; category: string; amount: number }[],
  classifications: { transactionId: number; spendingType: SpendingType }[],
): DiagramCategory[] {
  const classificationById = new Map(classifications.map((item) => [item.transactionId, item.spendingType]));
  const detailsByType = new Map<SpendingType, Map<string, number>>();
  for (const definition of spendingTypeDefinitions) detailsByType.set(definition.type, new Map());

  for (const transaction of transactions) {
    const spendingType = classificationById.get(transaction.transactionId);
    if (!spendingType) throw new Error('Gemini did not classify every spending transaction.');
    const details = detailsByType.get(spendingType);
    if (!details) throw new Error('Gemini returned an unsupported spending type.');
    details.set(transaction.category, (details.get(transaction.category) ?? 0) + transaction.amount);
  }

  return spendingTypeDefinitions.map((definition) => {
    const details = [...(detailsByType.get(definition.type) ?? new Map())]
      .map(([category, amount]) => ({ category, amount, color: definition.color }));
    return {
      category: definition.category,
      color: definition.color,
      amount: details.reduce((sum, item) => sum + item.amount, 0),
      details,
    };
  });
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

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function createMonthOptions(earliestMonth: string | undefined, currentMonth: string) {
  const firstMonth = earliestMonth ?? currentMonth;
  const [currentYear, currentMonthNumber] = currentMonth.split('-').map(Number);
  const [earliestYear, earliestMonthNumber] = firstMonth.split('-').map(Number);
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
    height: 72,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  closeButton: {
    width: 48,
    height: 48,
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
    width: 48,
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
  categoryDetails: {
    marginLeft: 22,
    marginTop: -5,
    marginBottom: 10,
    fontSize: 11,
    lineHeight: 16,
  },
  categoryAmount: {
    fontVariant: ['tabular-nums'],
  },
  retryButton: { marginTop: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: '#e2f3e8' },
  retryText: { color: bankGreen },
  pressed: {
    opacity: 0.75,
  },
});
