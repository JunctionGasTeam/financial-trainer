import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
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
import { BasketMoveSheet, type BasketRow } from '@/components/basket-move-sheet';
import {
  getMonthlyTransactionSummary,
  getTransactionMonthRange,
  type MonthlyTransactionSummary,
  type MonthlyCategory,
  type TransactionMonthRange,
} from '@/data/transactions';
import type { Classifier } from '@/features/baskets/classifier';
import { basketLabels, type Basket } from '@/features/baskets/rules';
import { useBaskets } from '@/hooks/use-baskets';
import { useTheme } from '@/hooks/use-theme';
import { CloseButton, closeButtonSize } from '@/components/ui/close-button';

const bankGreen = '#008044';
const emptySummary: MonthlyTransactionSummary = {
  spending: { total: 0, categories: [] },
  income: { total: 0, categories: [] },
};

type PageIndex = 0 | 1;
type DiagramCategory = MonthlyCategory & { details?: MonthlyCategory[]; basket?: Basket; movedCount?: number };

export function SpendingBreakdown({ onClose }: { onClose: () => void }) {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [activePage, setActivePage] = useState<PageIndex>(0);
  const [monthRange, setMonthRange] = useState<TransactionMonthRange | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loadedMonth, setLoadedMonth] = useState('');
  const [monthSummary, setMonthSummary] = useState(emptySummary);
  const { transactions, classifier, overrides, reset } = useBaskets();
  const [openBasket, setOpenBasket] = useState<Basket | null>(null);
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
  const loadingSummary = !loadError && (!selectedMonth || loadedMonth !== selectedMonth || !classifier);
  // Baskets come from the shared rules plus the user's moves, so they match every other screen.
  const monthRows = useMemo(
    () => (classifier ? basketRowsForMonth(transactions, classifier, selectedMonth) : []),
    [transactions, classifier, selectedMonth],
  );
  const spendingGroups = useMemo(() => buildSpendingGroups(monthRows), [monthRows]);
  const movedToSavings = useMemo(
    () => (classifier ? transfersForMonth(transactions, classifier, selectedMonth) : 0),
    [transactions, classifier, selectedMonth],
  );
  const pages = [
    {
      key: 'spending', label: 'Spending', listHeading: 'Your three baskets', centerLabel: 'SPENT',
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
        const summary = await getMonthlyTransactionSummary(db, selectedMonth);
        if (!active) return;
        setMonthSummary(summary);
        setLoadedMonth(selectedMonth);
        setLoadError('');
      } catch (cause) {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'Could not load this month.');
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
          <CloseButton accessibilityLabel="Close spending and income overview" onPress={onClose} />
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
            <ThemedText type="small" themeColor="textSecondary">{loadError || 'Loading transactions…'}</ThemedText>
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
                  onOpenBasket={page.key === 'spending' ? setOpenBasket : undefined}
                  footer={page.key === 'spending' ? (
                    <SpendingFooter
                      movedToSavings={movedToSavings}
                      moveCount={overrides.length}
                      onReset={reset}
                    />
                  ) : null}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <BasketMoveSheet
        basket={openBasket}
        monthLabel={monthLabel}
        rows={monthRows.filter((row) => row.decision.bucket === openBasket)}
        onClose={() => setOpenBasket(null)}
      />

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
  onOpenBasket,
  footer,
}: {
  width: number;
  label: string;
  listHeading: string;
  centerLabel: string;
  total: number;
  categories: readonly DiagramCategory[];
  monthLabel: string;
  onOpenBasket?: (basket: Basket) => void;
  footer?: ReactNode;
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

      <View style={styles.chartHeader}>
        <Text style={[styles.chartLabel, { color: theme.textSecondary }]}>{centerLabel}</Text>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.chartTotal, { color: theme.text }]}>
          {formatEuro(total)}
        </Text>
      </View>

      <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
        <Svg width={chartSize} height={chartSize} viewBox="0 0 220 220">
          {visibleCategories.length === 0 ? (
            <Circle cx={PIE_CENTER} cy={PIE_CENTER} r={PIE_RADIUS} fill={theme.backgroundElement} />
          ) : visibleCategories.length === 1 ? (
            <Circle cx={PIE_CENTER} cy={PIE_CENTER} r={PIE_RADIUS} fill={visibleCategories[0].color} />
          ) : (
            visibleCategories.map((category, index) => {
              const startAngle = -90 + (visibleCategories
                .slice(0, index)
                .reduce((sum, item) => sum + item.amount, 0) / total) * 360;
              const endAngle = startAngle + (category.amount / total) * 360;
              const slice = roundedSlice(startAngle, endAngle);
              return slice.kind === 'path' ? (
                <Path
                  key={category.category}
                  d={slice.d}
                  fill={category.color}
                  stroke={category.color}
                  strokeWidth={SLICE_ROUND * 2}
                  strokeLinejoin="round"
                />
              ) : (
                <Circle key={category.category} cx={slice.x} cy={slice.y} r={slice.r} fill={category.color} />
              );
            })
          )}
        </Svg>
      </View>

      <View style={styles.listHeading}>
        <ThemedText type="subtitle" style={styles.listTitle}>
          {listHeading}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {label === 'Spending' ? 'Tap one to move things' : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`}
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.categoryList}>
        {categories.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyMessage}>
            No transactions were recorded in {monthLabel}.
          </ThemedText>
        ) : (
          categories.map((category, index) => (
            <Pressable
              key={category.category}
              disabled={!onOpenBasket || !category.basket}
              accessibilityRole={onOpenBasket && category.basket ? 'button' : undefined}
              accessibilityHint={onOpenBasket && category.basket ? 'Shows the purchases and lets you move them to another basket' : undefined}
              onPress={() => category.basket && onOpenBasket?.(category.basket)}
              style={({ pressed }) => pressed && styles.pressed}>
              {index > 0 && <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />}
              <View style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <ThemedText style={styles.categoryName}>{category.category}</ThemedText>
                {category.movedCount ? (
                  <Text style={styles.movedBadge}>{category.movedCount} moved</Text>
                ) : null}
                {total > 0 ? (
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.categoryAmount}>
                    {formatPercent(category.amount / total)}
                  </ThemedText>
                ) : null}
                <ThemedText type="smallBold" style={styles.categoryAmount}>
                  {formatEuro(category.amount)}
                </ThemedText>
                {onOpenBasket && category.basket ? (
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    tintColor={theme.textSecondary}
                    size={16}
                  />
                ) : null}
              </View>
              {category.details ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.categoryDetails}>
                  {category.details.length > 0
                    ? category.details.map((detail) => `${detail.category} ${formatEuro(detail.amount)}`).join(' · ')
                    : 'No transactions recorded in this type.'}
                </ThemedText>
              ) : null}
            </Pressable>
          ))
        )}
      </ThemedView>
      {footer}
    </ScrollView>
  );
}

const basketColors: Record<Basket, string> = {
  regular: '#008044',
  irregular: '#5c8db0',
  everyday: '#d5a338',
};

/** Plain-language line under each basket name: the challenge's three kinds of spending. */
const basketHints: Record<Basket, string> = {
  regular: 'Mandatory and regular',
  irregular: 'Mandatory but irregular',
  everyday: 'Everyday spending that slips through your fingers',
};

function basketRowsForMonth(transactions: BasketRow['tx'][], classifier: Classifier, month: string): BasketRow[] {
  if (!month) return [];
  return transactions
    .filter((tx) => tx.amount < 0 && tx.date.startsWith(month))
    .map((tx) => ({ tx, decision: classifier.decide(tx) }))
    .filter((row) => row.decision.bucket in basketLabels)
    .reverse();
}

function transfersForMonth(transactions: BasketRow['tx'][], classifier: Classifier, month: string) {
  return transactions
    .filter((tx) => tx.amount < 0 && tx.date.startsWith(month) && classifier.bucketOf(tx) === 'transfer')
    .reduce((sum, tx) => sum - tx.amount, 0);
}

function buildSpendingGroups(rows: BasketRow[]): DiagramCategory[] {
  return (['regular', 'irregular', 'everyday'] as const).map((basket) => {
    const inBasket = rows.filter((row) => row.decision.bucket === basket);
    const byCategory = new Map<string, number>();
    for (const { tx } of inBasket) byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) - tx.amount);
    const details = [...byCategory]
      .map(([category, amount]) => ({ category, amount, color: basketColors[basket] }))
      .sort((a, b) => b.amount - a.amount);
    return {
      category: `${basketLabels[basket]} · ${basketHints[basket]}`,
      color: basketColors[basket],
      amount: details.reduce((sum, item) => sum + item.amount, 0),
      details,
      basket,
      movedCount: inBasket.filter((row) => row.decision.movedBy).length,
    };
  });
}

function SpendingFooter({ movedToSavings, moveCount, onReset }: { movedToSavings: number; moveCount: number; onReset: () => void }) {
  if (movedToSavings <= 0 && moveCount === 0) return null;
  return (
    <View style={styles.footer}>
      {movedToSavings > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {formatEuro(movedToSavings)} moved to savings and investments is not counted as spending.
        </ThemedText>
      ) : null}
      {moveCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset basket changes to the defaults"
          onPress={onReset}
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.retryText}>
            Reset my basket changes ({moveCount})
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const PIE_CENTER = 110;
const PIE_RADIUS = 102;
/** Clear space between neighbouring slices, in viewBox units. */
const SLICE_GAP = 6;
/** Corner radius of every slice; drawn as a round-joined stroke of this half-width. */
const SLICE_ROUND = 8;

type Slice =
  | { kind: 'path'; d: string }
  | { kind: 'dot'; x: number; y: number; r: number };

/**
 * A pie wedge with a gap to its neighbours and rounded corners. The wedge is
 * inset by gap/2 + corner radius on each straight edge and by the corner radius
 * on the arc; the caller strokes it with width 2 × SLICE_ROUND and round joins,
 * which grows it back out with rounded corners while keeping the gap clear.
 */
function roundedSlice(startAngle: number, endAngle: number): Slice {
  const sweep = endAngle - startAngle;
  const mid = (startAngle + endAngle) / 2;
  const offset = SLICE_GAP / 2 + SLICE_ROUND;
  const outer = PIE_RADIUS - SLICE_ROUND;
  const edgeShift = (Math.asin(offset / outer) * 180) / Math.PI;
  const start = polarPoint(PIE_CENTER, outer, startAngle + edgeShift);
  const end = polarPoint(PIE_CENTER, outer, endAngle - edgeShift);
  const largeArc = sweep - 2 * edgeShift > 180 ? 1 : 0;

  if (sweep > 180) {
    // Reflex wedge: the inset edges never meet, so the inner corner is a small
    // arc around the centre that keeps the gap clear on the other slices' side.
    const nearStart = polarPoint(PIE_CENTER, offset, startAngle + 90);
    const nearEnd = polarPoint(PIE_CENTER, offset, endAngle - 90);
    return {
      kind: 'path',
      d: `M ${nearStart.x} ${nearStart.y} L ${start.x} ${start.y} A ${outer} ${outer} 0 ${largeArc} 1 ${end.x} ${end.y} L ${nearEnd.x} ${nearEnd.y} A ${offset} ${offset} 0 0 0 ${nearStart.x} ${nearStart.y} Z`,
    };
  }

  const halfSweep = ((sweep / 2) * Math.PI) / 180;
  const tipDistance = offset / Math.sin(halfSweep);

  if (sweep - 2 * edgeShift <= 0 || tipDistance >= outer) {
    // Too thin to round: keep a visible dot near the rim so the share doesn't vanish.
    const point = polarPoint(PIE_CENTER, PIE_RADIUS - SLICE_ROUND - 4, mid);
    return { kind: 'dot', x: point.x, y: point.y, r: SLICE_ROUND / 2 + 2 };
  }

  const tip = polarPoint(PIE_CENTER, tipDistance, mid);
  return {
    kind: 'path',
    d: `M ${tip.x} ${tip.y} L ${start.x} ${start.y} A ${outer} ${outer} 0 ${largeArc} 1 ${end.x} ${end.y} Z`,
  };
}

function formatPercent(share: number) {
  if (share > 0 && share < 0.005) return '<1%';
  return `${Math.round(share * 100)}%`;
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerBalance: {
    width: closeButtonSize,
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
  chartHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
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
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  movedBadge: {
    color: bankGreen,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#e2f3e8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  retryButton: { marginTop: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: '#e2f3e8' },
  retryText: { color: bankGreen },
  pressed: {
    opacity: 0.75,
  },
});
