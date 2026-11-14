import { useEffect, useMemo, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRecentTransactionData, type RecentTransactionData } from '@/data/transactions';
import { getSavingsCoach, type SavingsCoach } from '@/features/savings/api';
import { analyzeSpendingHabits, buildSavingsScenarios } from '@/features/savings/plan';
import { useTheme } from '@/hooks/use-theme';
import { CloseButton, closeButtonSize } from '@/components/ui/close-button';
import { useWipe, WipeScreen } from '@/components/ui/wipe-screen';

const green = '#008044';
const timelineOptions = [6, 12, 18, 24, 36, 60];
const formatEuro = (amount: number) => new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

export default function SavingsGoalScreen() {
  return (
    <WipeScreen from="right">
      <SavingsGoal />
    </WipeScreen>
  );
}

function SavingsGoal() {
  const { close } = useWipe();
  const db = useSQLiteContext();
  const theme = useTheme();
  const [transactionData, setTransactionData] = useState<RecentTransactionData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [goalAmount, setGoalAmount] = useState(0);
  const [targetMonths, setTargetMonths] = useState(18);
  const timelineTouched = useRef(false);
  const aiSuggestionApplied = useRef(false);
  const [goalError, setGoalError] = useState('');
  const [coach, setCoach] = useState<SavingsCoach | null>(null);
  const [coachError, setCoachError] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachRequestVersion, setCoachRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    getRecentTransactionData(db).then((data) => {
      if (active) setTransactionData(data);
    }).catch(() => {
      if (active) setDataError('Could not load transaction history from SQLite.');
    }).finally(() => {
      if (active) setLoadingData(false);
    });
    return () => { active = false; };
  }, [db]);

  const analysis = useMemo(() => transactionData
    ? analyzeSpendingHabits(transactionData.monthlyData, transactionData.window.availableMonths, transactionData.window.requestedMonths)
    : null, [transactionData]);
  const monthlyTarget = goalAmount > 0 ? Math.ceil(goalAmount / targetMonths) : 0;
  const flexibleCategories = useMemo(() => analysis?.categories.filter((item) => item.group === 'flexible') ?? [], [analysis]);
  const flexibleTotal = useMemo(() => flexibleCategories.reduce((sum, item) => sum + item.averageMonthly, 0), [flexibleCategories]);
  const deadlineCutNeeded = analysis ? Math.max(0, monthlyTarget - analysis.medianMonthlySurplus) : 0;
  const deadlineCutUsed = Math.min(deadlineCutNeeded, flexibleTotal);
  const deadlineCutShare = flexibleTotal > 0 ? deadlineCutUsed / flexibleTotal : 0;
  const allDeadlineCuts = useMemo(() => flexibleCategories.map((item) => ({ category: item.category, amount: item.averageMonthly * deadlineCutShare })), [flexibleCategories, deadlineCutShare]);
  const deadlineCutRows = useMemo(() => allDeadlineCuts.length > 4
    ? [...allDeadlineCuts.slice(0, 3), { category: 'Other flexible spending', amount: allDeadlineCuts.slice(3).reduce((sum, item) => sum + item.amount, 0) }]
    : allDeadlineCuts, [allDeadlineCuts]);
  const deadlineCutGap = Math.max(0, deadlineCutNeeded - flexibleTotal);
  const topCategories = analysis?.categories.slice(0, 4) ?? [];
  const maxCategorySpend = Math.max(1, ...topCategories.map((category) => category.averageMonthly));
  const spendingGroups = analysis ? ([
    { id: 'essentials', label: 'Essentials', color: green },
    { id: 'flexible', label: 'Flexible', color: '#d5a338' },
    { id: 'savings', label: 'Savings', color: '#5c8db0' },
    { id: 'other', label: 'Other', color: '#a1aaa7' },
  ] as const).map((group) => {
    const amount = analysis.categories.filter((item) => item.group === group.id).reduce((sum, item) => sum + item.averageMonthly, 0);
    return { ...group, amount, share: analysis.averageMonthlySpending > 0 ? amount / analysis.averageMonthlySpending : 0 };
  }).filter((group) => group.amount > 0) : [];
  const deadlineMonthlySaving = Math.max(0, analysis ? analysis.medianMonthlySurplus + deadlineCutUsed : 0);

  function makePlan() {
    Keyboard.dismiss();
    const amount = Number(goalInput.trim().replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setGoalError('Enter a savings goal greater than €0.');
      return;
    }
    if (!analysis || analysis.monthsAvailable === 0) {
      setGoalError('There is not enough transaction history to create a plan.');
      return;
    }

    timelineTouched.current = false;
    aiSuggestionApplied.current = false;
    setTargetMonths(18);
    setGoalAmount(amount);
    setGoalError('');
    setCoach(null);
    setCoachError('');
    setCoachLoading(true);
    setCoachRequestVersion((version) => version + 1);
  }

  useEffect(() => {
    if (!analysis || goalAmount <= 0) return;
    let current = true;
    const timeout = setTimeout(() => {
      setCoachLoading(true);
      setCoachError('');
      const balancedScenario = buildSavingsScenarios(analysis, goalAmount).find((scenario) => scenario.id === 'balanced');
      void getSavingsCoach(goalAmount, analysis, balancedScenario?.monthlyContribution ?? 0, timelineOptions, {
        targetMonths,
        monthlyTarget,
        additionalCutNeeded: deadlineCutNeeded,
        selectedScenario: 'Deadline plan',
        plannedMonthlySaving: deadlineMonthlySaving,
        recommendedCuts: deadlineCutRows,
      }).then((result) => {
        if (!current) return;
        setCoach(result);
        if (!aiSuggestionApplied.current) {
          aiSuggestionApplied.current = true;
          if (!timelineTouched.current) setTargetMonths(result.recommendedMonths);
        }
      }).catch((error: unknown) => {
        if (current) setCoachError(error instanceof Error ? error.message : 'The AI coach is unavailable right now.');
      }).finally(() => {
        if (current) setCoachLoading(false);
      });
    }, 500);
    return () => { current = false; clearTimeout(timeout); };
  }, [analysis, goalAmount, targetMonths, monthlyTarget, deadlineCutNeeded, deadlineCutRows, deadlineMonthlySaving, coachRequestVersion]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.backgroundSelected }]}>
          <CloseButton accessibilityLabel="Close savings goal" onPress={close} />
          <ThemedText type="smallBold">Savings goal</ThemedText>
          <View style={styles.headerBalance} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.eyebrow}>SAVINGS PLAN</ThemedText>
          <ThemedText type="subtitle" style={styles.title}>Reach your goal</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>Enter a target. See where your money goes and how long saving may take.</ThemedText>

          <View style={[styles.goalCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.fieldLabel}>I WANT TO SAVE</ThemedText>
            <View style={[styles.amountField, { borderColor: theme.backgroundSelected }]}>
              <ThemedText style={[styles.euroPrefix, { color: theme.textSecondary }]}>€</ThemedText>
              <TextInput
                value={goalInput}
                onChangeText={(value) => { setGoalInput(value); setGoalAmount(0); setCoach(null); setCoachError(''); setCoachLoading(false); }}
              placeholder="3000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                accessibilityLabel="Savings target amount"
                style={[styles.goalInput, { color: theme.text }]}
              />
            </View>
            <Pressable accessibilityRole="button" disabled={loadingData || coachLoading} onPress={() => void makePlan()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (loadingData || coachLoading) && styles.disabled]}>
              {coachLoading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryButtonText}>Show my plan</ThemedText>}
            </Pressable>
            {goalError ? <ThemedText accessibilityRole="alert" style={styles.errorText}>{goalError}</ThemedText> : null}
            {dataError ? <ThemedText accessibilityRole="alert" style={styles.errorText}>{dataError}</ThemedText> : null}
            {loadingData ? <ThemedText style={styles.helperText}>Loading your transaction history…</ThemedText> : analysis ? <ThemedText style={styles.helperText}>Based on {analysis.monthsAvailable} months with transactions{analysis.monthsMissing ? ` · ${analysis.monthsMissing} months have no data` : ''}</ThemedText> : null}
          </View>

          {analysis && analysis.monthsAvailable > 0 ? (
            <>
              <View style={[styles.profileCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileIcon}><SymbolView name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }} tintColor={green} size={23} /></View>
                  <View style={styles.profileCopy}>
                    <ThemedText style={styles.cardEyebrow}>YOUR SPENDING STYLE</ThemedText>
                    <ThemedText type="subtitle" style={styles.profileType}>{analysis.profile.type}</ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.profileDescription}>{analysis.profile.description}</ThemedText>
                <View style={styles.statsRow}>
                  <MiniStat label="INCOME / MO" value={formatEuro(analysis.averageMonthlyIncome)} color={theme.text} />
                  <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
                  <MiniStat label="SPENDING / MO" value={formatEuro(analysis.averageMonthlySpending)} color={theme.text} />
                  <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
                  <MiniStat label="USUALLY LEFT / MO" value={formatEuro(analysis.medianMonthlySurplus)} color={theme.text} positive={analysis.medianMonthlySurplus >= 0} />
                </View>
                <ThemedText style={styles.statsHint}>Typical monthly income, spending, and money left after spending.</ThemedText>
              </View>

              <View style={styles.sectionHeading}>
                <ThemedText type="smallBold">Where it goes each month</ThemedText>
              </View>
              <View style={[styles.categoryCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.compositionBar}>
                  {spendingGroups.map((group) => <View key={group.id} style={{ width: `${group.share * 100}%`, backgroundColor: group.color }} />)}
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.chartHint}>Average spending by type. Percentages add up to 100%.</ThemedText>
                <View style={styles.compositionLegend}>
                  {spendingGroups.map((group) => <View key={group.id} style={styles.compositionItem}>
                    <View style={[styles.legendDot, { backgroundColor: group.color }]} />
                    <View style={styles.compositionCopy}><ThemedText style={styles.compositionLabel}>{group.label}</ThemedText><ThemedText type="smallBold" style={styles.categoryAmount}>{formatEuro(group.amount)}<ThemedText style={styles.perMonth}> / mo</ThemedText></ThemedText></View>
                    <ThemedText type="small" themeColor="textSecondary">{Math.round(group.share * 100)}%</ThemedText>
                  </View>)}
                </View>
                <View style={[styles.categoryDivider, { backgroundColor: theme.backgroundSelected }]} />
                    <ThemedText style={styles.topCategoriesLabel}>BIGGEST EXPENSES · PER MONTH</ThemedText>
                {topCategories.length ? topCategories.map((category, index) => (
                  <View key={category.category} style={styles.categoryRow}>
                    <View style={styles.categoryCopy}>
                      <ThemedText type="smallBold" style={styles.categoryName}>{category.category}</ThemedText>
                      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}><View style={[styles.trackFill, { width: `${Math.max(3, (category.averageMonthly / maxCategorySpend) * 100)}%`, backgroundColor: category.group === 'flexible' ? '#d5a338' : green }]} /></View>
                    </View>
                    <ThemedText type="smallBold" style={styles.categoryAmount}>{formatEuro(category.averageMonthly)}</ThemedText>
                    {index < topCategories.length - 1 ? <View style={[styles.rowSeparator, { backgroundColor: theme.backgroundSelected }]} /> : null}
                  </View>
                )) : <ThemedText type="small" themeColor="textSecondary">No spending categories found.</ThemedText>}
              </View>

              {goalAmount > 0 ? (
                <>
                  <View style={styles.sectionHeading}>
                    <ThemedText type="smallBold">When do you want to reach your goal?</ThemedText>
                  </View>
                  <View style={styles.timelineOptions}>
                    {timelineOptions.map((months) => <Pressable key={months} accessibilityRole="radio" accessibilityState={{ checked: targetMonths === months }} onPress={() => { if (targetMonths === months) return; timelineTouched.current = true; setCoach(null); setCoachLoading(true); setCoachError(''); setTargetMonths(months); }} style={[styles.timelineOption, { backgroundColor: targetMonths === months ? green : theme.backgroundElement, borderColor: targetMonths === months ? green : theme.backgroundSelected }]}>
                      <ThemedText style={[styles.timelineOptionText, { color: targetMonths === months ? '#fff' : theme.text }]}>{formatShortDuration(months)}</ThemedText>
                      {coach?.recommendedMonths === months ? <ThemedText style={[styles.timelineSuggested, { color: targetMonths === months ? '#d8f1df' : green }]}>AI PICK</ThemedText> : null}
                    </Pressable>)}
                  </View>
                  <View style={styles.forecastCard}>
                    <ThemedText style={styles.forecastEyebrow}>YOUR TARGET</ThemedText>
                    <ThemedText style={styles.forecastDuration}>{formatEuro(Math.ceil(goalAmount / targetMonths))} / month</ThemedText>
                    <ThemedText style={styles.forecastDate}>to reach {formatEuro(goalAmount)} in {formatDuration(targetMonths)} · around {formatGoalDate(targetMonths)}</ThemedText>
                    {deadlineCutGap > 0
                      ? <ThemedText style={styles.forecastStatus}>Short by {formatEuro(deadlineCutGap)} / month even if you cut all recorded flexible spending.</ThemedText>
                      : <ThemedText style={styles.forecastStatus}>This plan could set aside about {formatEuro(deadlineMonthlySaving)} / month.</ThemedText>}
                    <View style={styles.timelineTrack}><View style={styles.timelineStart}><View style={styles.timelineDot} /><ThemedText style={styles.timelineLabel}>Today</ThemedText></View><View style={styles.timelineLine} /><View style={styles.timelineEnd}><View style={[styles.timelineDot, styles.timelineEndDot]} /><ThemedText style={styles.timelineLabel}>{formatEuro(goalAmount)} goal</ThemedText></View></View>
                    <View style={styles.forecastMath}>
                      <View style={styles.forecastMathItem}><ThemedText style={styles.forecastMathValue}>{formatEuro(analysis.medianMonthlySurplus)}</ThemedText><ThemedText style={styles.forecastMathLabel}>typical balance / mo</ThemedText></View>
                      <ThemedText style={styles.forecastMathPlus}>+</ThemedText>
                      <View style={styles.forecastMathItem}><ThemedText style={styles.forecastMathValue}>{formatEuro(deadlineCutNeeded)}</ThemedText><ThemedText style={styles.forecastMathLabel}>cuts needed / mo</ThemedText></View>
                      <ThemedText style={styles.forecastMathPlus}>=</ThemedText>
                      <View style={styles.forecastMathItem}><ThemedText style={styles.forecastMathValue}>{formatEuro(monthlyTarget)}</ThemedText><ThemedText style={styles.forecastMathLabel}>needed for goal / mo</ThemedText></View>
                    </View>
                    <ThemedText style={styles.forecastNote}>The estimate assumes you have €0 saved today. A negative typical balance means spending exceeded income in a typical month.</ThemedText>
                  </View>
                  <View style={[styles.deadlinePlanCard, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="smallBold">Changes needed for your deadline</ThemedText>
                    {deadlineCutNeeded <= 0 ? <ThemedText type="small" themeColor="textSecondary">Your usual monthly balance is enough to meet this target without cutting extra spending.</ThemedText> : <>
                      <ThemedText type="small" themeColor="textSecondary">To save {formatEuro(monthlyTarget)} each month, reduce flexible spending by about {formatEuro(deadlineCutUsed)} / month{flexibleTotal > 0 ? ` (${Math.round(deadlineCutShare * 100)}% of it)` : ''}.</ThemedText>
                      {deadlineCutRows.map((item) => <View key={item.category} style={styles.deadlineCutRow}><ThemedText type="small">{item.category}</ThemedText><ThemedText type="smallBold" style={styles.deadlineCutAmount}>−{formatEuro(item.amount)} / mo</ThemedText></View>)}
                      {deadlineCutGap > 0 ? <ThemedText style={styles.warningText}>Even cutting all recorded flexible spending leaves a {formatEuro(deadlineCutGap)} / month gap. Choose a longer timeline or add income.</ThemedText> : null}
                      {deadlineCutShare > 0.35 && deadlineCutGap === 0 ? <ThemedText style={styles.warningText}>This is a large cut to flexible spending. Consider a longer timeline if it feels unrealistic.</ThemedText> : null}
                    </>}
                  </View>
                </>
              ) : null}

              <View style={[styles.coachCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.coachHeader}><View style={styles.coachIcon}><SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} tintColor={green} size={18} /></View><View><ThemedText type="smallBold" style={styles.coachTitle}>AI recommendation</ThemedText><ThemedText style={styles.coachSubtitle}>Personalized to your goal and spending</ThemedText></View></View>
                {coachLoading ? <View style={styles.coachLoading}><ActivityIndicator color={green} /><ThemedText type="small" themeColor="textSecondary">Finding a realistic timeline…</ThemedText></View> : coach ? <View style={styles.coachCopy}><ThemedText type="small" themeColor="textSecondary">{coach.insight}</ThemedText><ThemedText type="smallBold" style={styles.coachAction}>{coach.action}</ThemedText></View> : <ThemedText type="small" themeColor="textSecondary">{coachError ? 'AI advice is unavailable right now. Choose a timeline above; your savings estimate still works.' : 'Build your plan to get a goal-specific recommendation.'}</ThemedText>}
                <ThemedText style={styles.coachPrivacy}>Uses monthly averages and category totals only.</ThemedText>
              </View>
            </>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>Estimates use recorded months and assume you start from €0 saved.</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function MiniStat({ label, value, color, positive }: { label: string; value: string; color: string; positive?: boolean }) {
  return <View style={styles.stat}>
    <ThemedText style={styles.statLabel} numberOfLines={2}>{label}</ThemedText>
    <ThemedText style={[styles.statValue, { color }, positive === false && styles.negative]}>{value}</ThemedText>
  </View>;
}

function formatDuration(months: number) {
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (!remainder) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${years} ${years === 1 ? 'year' : 'years'} ${remainder} ${remainder === 1 ? 'month' : 'months'}`;
}

function formatShortDuration(months: number) {
  if (months < 12) return `${months} mo`;
  if (months % 12 === 0) return `${months / 12} yr`;
  return `${months} mo`;
}

function formatGoalDate(months: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { height: 72, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBalance: { width: closeButtonSize },
  content: { padding: 20, paddingTop: 20, paddingBottom: 42, gap: 16 },
  eyebrow: { color: green, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: -9, fontSize: 29, lineHeight: 36 },
  intro: { lineHeight: 21, marginTop: -7 },
  goalCard: { padding: 16, borderRadius: 18, gap: 11 },
  fieldLabel: { color: '#758078', fontSize: 8, fontWeight: '800', letterSpacing: 0.65 },
  amountField: { minHeight: 52, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  euroPrefix: { fontSize: 20, fontWeight: '600' },
  goalInput: { flex: 1, fontSize: 22, fontWeight: '700', marginLeft: 8, padding: 0 },
  primaryButton: { minHeight: 48, backgroundColor: green, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  helperText: { color: '#758078', fontSize: 9 },
  errorText: { color: '#b33838', fontSize: 10 },
  profileCard: { padding: 16, borderRadius: 18, gap: 12 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  profileIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#e4f2e8', alignItems: 'center', justifyContent: 'center' },
  profileCopy: { gap: 2 },
  cardEyebrow: { color: green, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  profileType: { color: green, fontSize: 22, lineHeight: 27 },
  profileDescription: { lineHeight: 19 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9e3dc' },
  stat: { flex: 1, gap: 4 },
  statLabel: { color: '#758078', fontSize: 7, fontWeight: '800', letterSpacing: 0.35 },
  statValue: { fontSize: 12, fontWeight: '700' },
  negative: { color: '#b3433b' },
  statDivider: { height: 27, width: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  sectionHeading: { marginTop: 2, marginBottom: -5 },
  statsHint: { color: '#758078', fontSize: 9, lineHeight: 14, marginTop: -6 },
  chartHint: { fontSize: 9, lineHeight: 14, marginBottom: 12 },
  scenarioHint: { marginTop: -10, fontSize: 10, lineHeight: 16 },
  timelineOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  timelineOption: { minWidth: 49, flexGrow: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 5 },
  timelineOptionText: { fontSize: 11, fontWeight: '700' },
  timelineSuggested: { fontSize: 6, fontWeight: '900', letterSpacing: 0.25, marginTop: 2 },
  forecastCard: { backgroundColor: '#e9f4ec', padding: 18, borderRadius: 20, gap: 8 },
  forecastEyebrow: { color: green, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  forecastDuration: { color: '#173e29', fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 3 },
  forecastDate: { color: '#486555', fontSize: 12, lineHeight: 18 },
  forecastStatus: { color: '#315c42', fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  timelineTrack: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  timelineStart: { alignItems: 'center', gap: 5 },
  timelineEnd: { alignItems: 'center', gap: 5 },
  timelineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#80a890' },
  timelineEndDot: { width: 15, height: 15, borderRadius: 8, backgroundColor: green, borderWidth: 3, borderColor: '#c1dec9' },
  timelineLine: { flex: 1, height: 2, backgroundColor: '#b8cfc0', marginHorizontal: 6, marginBottom: 17 },
  timelineLabel: { color: '#486555', fontSize: 9, fontWeight: '700' },
  forecastMath: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#cbded0', paddingTop: 12, marginTop: 7 },
  forecastMathItem: { flex: 1, alignItems: 'center', gap: 4 },
  forecastMathValue: { color: '#173e29', fontSize: 12, fontWeight: '800' },
  forecastMathLabel: { color: '#607467', fontSize: 8, textAlign: 'center' },
  forecastMathPlus: { color: '#607467', fontSize: 12, fontWeight: '700' },
  forecastNote: { color: '#607467', fontSize: 9, lineHeight: 14, marginTop: 3 },
  deadlinePlanCard: { padding: 16, borderRadius: 18, gap: 9 },
  deadlineCutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9e3dc', paddingTop: 8 },
  deadlineCutAmount: { color: green, fontSize: 10 },
  categoryCard: { paddingHorizontal: 14, borderRadius: 17 },
  compositionBar: { height: 12, flexDirection: 'row', overflow: 'hidden', borderRadius: 6, marginTop: 15, marginBottom: 12 },
  compositionLegend: { gap: 10 },
  compositionItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  compositionCopy: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compositionLabel: { fontSize: 10 },
  perMonth: { color: '#758078', fontSize: 8, fontWeight: '500' },
  categoryDivider: { height: StyleSheet.hairlineWidth, marginTop: 13 },
  topCategoriesLabel: { color: '#758078', fontSize: 8, fontWeight: '800', letterSpacing: 0.65, marginTop: 12 },
  categoryRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  categoryCopy: { flex: 1, gap: 7 },
  categoryName: { fontSize: 11 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: 5, borderRadius: 3 },
  categoryAmount: { minWidth: 65, textAlign: 'right', fontSize: 10 },
  rowSeparator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#d9e3dc' },
  scenarioList: { gap: 9 },
  scenarioCard: { padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 14 },
  scenarioTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  scenarioNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#9da9a1', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioSelected: { borderColor: green },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: green },
  recommended: { borderRadius: 8, backgroundColor: '#e4f2e8', paddingHorizontal: 7, paddingVertical: 4 },
  recommendedText: { color: green, fontSize: 7, fontWeight: '800', letterSpacing: 0.45 },
  scenarioNumbers: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingLeft: 27 },
  scenarioTime: { alignItems: 'flex-end' },
  scenarioAmount: { color: '#17221c', fontSize: 16, fontWeight: '700', marginTop: 3 },
  scenarioUnit: { color: '#68756c', fontSize: 10, fontWeight: '500' },
  scenarioTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginLeft: 27 },
  scenarioTrackFill: { height: 6, borderRadius: 3 },
  scenarioLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 27, marginTop: -8 },
  actionCard: { padding: 16, borderRadius: 17, gap: 8 },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  actionTitle: { color: green },
  actionTotal: { color: green, fontSize: 11 },
  actionCaption: { color: '#4f5d54', fontSize: 10, lineHeight: 15, marginTop: 2 },
  actionBody: { color: '#4f5d54', lineHeight: 18 },
  reductionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#cbded0', paddingTop: 7 },
  reductionAmount: { color: green, fontSize: 10 },
  warningText: { color: '#9b5f14', lineHeight: 17, paddingTop: 4 },
  coachCard: { padding: 16, borderRadius: 18, gap: 12 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coachIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: '#e4f2e8', alignItems: 'center', justifyContent: 'center' },
  coachTitle: { fontSize: 15 },
  coachSubtitle: { color: '#758078', fontSize: 9, marginTop: 2 },
  coachCopy: { gap: 8 },
  coachAction: { color: green, lineHeight: 19 },
  coachLoading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  coachError: { color: '#b33838', fontSize: 10 },
  coachPrivacy: { fontSize: 9, lineHeight: 14 },
  disclaimer: { fontSize: 9, lineHeight: 15, paddingHorizontal: 2 },
});
