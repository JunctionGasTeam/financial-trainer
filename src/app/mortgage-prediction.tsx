import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMortgagePredictionContext, type MortgageApplicant } from '@/data/mortgage';
import { getRecentSalaryIncomeEstimate } from '@/data/transactions';
import { predictMortgageApproval, type MortgagePrediction } from '@/features/mortgage/api';
import { useTheme } from '@/hooks/use-theme';

const green = '#008044';

export default function MortgagePredictionScreen() {
  const customerDb = useSQLiteContext();
  return (
    <SQLiteProvider
      databaseName="mtg_tx_customer_link_and_final_mtg_infio.db"
      assetSource={{ assetId: require('../../assets/data/mtg_tx_customer_link_and_final_mtg_infio.db') }}>
      <MortgageHistoryProvider customerDb={customerDb} />
    </SQLiteProvider>
  );
}

function MortgageHistoryProvider({ customerDb }: { customerDb: SQLiteDatabase }) {
  const decisionsDb = useSQLiteContext();
  return (
    <SQLiteProvider
      databaseName="mtg_negotiation_history.db"
      assetSource={{ assetId: require('../../assets/data/mtg_negotiation_history.db') }}>
      <MortgageEstimator customerDb={customerDb} decisionsDb={decisionsDb} />
    </SQLiteProvider>
  );
}

function MortgageEstimator({ customerDb, decisionsDb }: { customerDb: SQLiteDatabase; decisionsDb: SQLiteDatabase }) {
  const historyDb = useSQLiteContext();
  const theme = useTheme();
  const [propertyPrice, setPropertyPrice] = useState('');
  const [equityAmount, setEquityAmount] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [incomeSource, setIncomeSource] = useState<MortgageApplicant['incomeSource']>('user_entered');
  const [incomeMonthsWithSalary, setIncomeMonthsWithSalary] = useState(0);
  const [incomePrefillReady, setIncomePrefillReady] = useState(false);
  const [prediction, setPrediction] = useState<MortgagePrediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const incomeWasEdited = useRef(false);

  useEffect(() => {
    let active = true;
    getRecentSalaryIncomeEstimate(customerDb).then((estimate) => {
      if (!active || !estimate || incomeWasEdited.current) return;
      setMonthlyIncome(String(estimate.averageMonthlyIncome));
      setIncomeSource('recent_salary_transactions');
      setIncomeMonthsWithSalary(estimate.monthsWithSalary);
    }).catch(() => {
      // The user can still enter monthly income manually if transaction data is unavailable.
    }).finally(() => {
      if (active) setIncomePrefillReady(true);
    });
    return () => { active = false; };
  }, [customerDb]);

  async function calculatePrediction() {
    const applicant: MortgageApplicant = {
      propertyPrice: parseAmount(propertyPrice),
      equityAmount: parseAmount(equityAmount),
      monthlyIncome: parseAmount(monthlyIncome),
      collateralValue: parseAmount(collateralValue),
      incomeSource,
      incomeMonthsWithSalary,
    };
    if ([applicant.propertyPrice, applicant.equityAmount, applicant.monthlyIncome, applicant.collateralValue]
      .some((amount) => !Number.isFinite(amount))) {
      setError('Enter a valid amount in each field.');
      setPrediction(null);
      return;
    }
    if (applicant.propertyPrice <= 0 || applicant.equityAmount < 0 || applicant.equityAmount >= applicant.propertyPrice ||
      applicant.monthlyIncome <= 0 || applicant.collateralValue <= 0) {
      setError('Property price, monthly income, and collateral must be above zero. Equity must be below the property price.');
      setPrediction(null);
      return;
    }

    setBusy(true);
    setError('');
    setPrediction(null);
    try {
      const context = await getMortgagePredictionContext(decisionsDb, historyDb, applicant);
      const result = await predictMortgageApproval(context);
      setPrediction(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not calculate a mortgage estimate.');
    } finally {
      setBusy(false);
    }
  }

  const loanAmount = parseAmount(propertyPrice) - parseAmount(equityAmount);
  const predictionStyle = prediction ? styles[prediction.prediction] : null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close mortgage estimate"
            hitSlop={12}
            onPress={() => router.back()}
            style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.closeGlyph, { color: theme.text }]}>×</Text>
          </Pressable>
          <ThemedText type="smallBold">Mortgage estimate</ThemedText>
          <View style={styles.headerBalance} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>FINANCIAL TRAINER</ThemedText>
          <ThemedText type="title" style={styles.title}>Mortgage prediction</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            Three Gemini agents compare your details with prior mortgage decisions and negotiation histories.
          </ThemedText>

          <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
            <AmountField label="Property price (€)" value={propertyPrice} onChangeText={setPropertyPrice} />
            <AmountField label="Your equity or down payment (€)" value={equityAmount} onChangeText={setEquityAmount} />
            <AmountField
              label="Monthly household income (€)"
              value={monthlyIncome}
              helper={incomeSource === 'recent_salary_transactions'
                ? `Average of Salary deposits in ${incomeMonthsWithSalary} months with records. Edit to include other household income.`
                : incomePrefillReady ? 'Enter monthly household income.' : 'Loading recent Salary transactions…'}
              onChangeText={(value) => {
                incomeWasEdited.current = true;
                setIncomeSource('user_entered');
                setIncomeMonthsWithSalary(0);
                setMonthlyIncome(value);
              }}
            />
            <AmountField label="Total collateral value (€)" value={collateralValue} onChangeText={setCollateralValue} />
            <View style={styles.loanEstimate}>
              <ThemedText type="small" themeColor="textSecondary">Estimated requested loan</ThemedText>
              <ThemedText type="smallBold" style={styles.loanAmount}>{loanAmount > 0 ? formatEuro(loanAmount) : '—'}</ThemedText>
            </View>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText type="smallBold" style={styles.errorTitle}>Estimate unavailable</ThemedText>
              <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={busy || !incomePrefillReady}
            onPress={calculatePrediction}
            style={[styles.primaryButton, (busy || !incomePrefillReady) && styles.disabled]}>
            {busy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <ThemedText type="smallBold" style={styles.primaryText}>Predicting decision</ThemedText>
              </View>
            ) : !incomePrefillReady ? (
              <ThemedText type="smallBold" style={styles.primaryText}>Preparing your estimate…</ThemedText>
            ) : (
              <ThemedText type="smallBold" style={styles.primaryText}>Predict mortgage decision</ThemedText>
            )}
          </Pressable>

          {prediction ? (
            <>
              <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" themeColor="textSecondary">FINAL PREDICTION</ThemedText>
                <ThemedText type="subtitle" style={[styles.predictionTitle, predictionStyle]}>
                  {predictionLabel(prediction.prediction)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">Confidence: {prediction.confidence}</ThemedText>
                <ThemedText type="small" style={styles.resultSummary}>{prediction.summary}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sampleNote}>
                  Compared with {prediction.historicalSample.totalCases} historical applications and {prediction.similarCaseCount} closest matches.
                </ThemedText>
              </View>

              <View style={[styles.analysisCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.agentStepTitle}>Applicant comparison</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.resultSummary}>{prediction.applicantComparison}</ThemedText>
                <View style={styles.factors}>
                  {prediction.factors.map((factor, index) => (
                    <View key={`${index}-${factor}`} style={styles.factor}>
                      <ThemedText type="smallBold" style={styles.factorBullet}>•</ThemedText>
                      <ThemedText type="small" style={styles.factorText}>{factor}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.analysisCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.agentStepTitle}>Closest historical cases</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.resultSummary}>{prediction.closestCasesSummary}</ThemedText>
              </View>
            </>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            This is an AI estimate based on the supplied historical cases, not a lender’s decision or a guarantee of approval.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function AmountField({
  label,
  value,
  helper,
  onChangeText,
}: {
  label: string;
  value: string;
  helper?: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="Enter amount"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
      />
      {helper ? <ThemedText type="small" themeColor="textSecondary" style={styles.fieldHelper}>{helper}</ThemedText> : null}
    </View>
  );
}

function parseAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized || !/^\d+(\.\d{0,2})?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

function formatEuro(amount: number) {
  return new Intl.NumberFormat('en-FI', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function predictionLabel(prediction: MortgagePrediction['prediction']) {
  if (prediction === 'likely_approved') return 'Likely approval';
  if (prediction === 'higher_rejection_risk') return 'Higher rejection risk';
  return 'Uncertain';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  closeButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { fontSize: 29, lineHeight: 32, fontWeight: '300' },
  headerBalance: { width: 38 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 14 },
  eyebrow: { letterSpacing: 1 },
  title: { marginTop: -8 },
  intro: { lineHeight: 21, marginBottom: 4 },
  formCard: { borderRadius: 18, padding: 16, gap: 14 },
  field: { gap: 6 },
  fieldHelper: { fontSize: 12, lineHeight: 16 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  loanEstimate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
  loanAmount: { color: green },
  errorCard: { borderRadius: 16, padding: 14, backgroundColor: '#fcebea', gap: 5 },
  errorTitle: { color: '#a13b32' },
  errorText: { color: '#7c342d' },
  primaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: green, paddingHorizontal: 18 },
  primaryText: { color: '#fff' },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  disabled: { opacity: 0.65 },
  analysisCard: { borderRadius: 18, padding: 16, gap: 8 },
  agentStepTitle: { color: green },
  resultCard: { borderRadius: 18, padding: 18, gap: 10 },
  predictionTitle: { marginTop: -6, lineHeight: 38 },
  likely_approved: { color: green },
  uncertain: { color: '#987018' },
  higher_rejection_risk: { color: '#a13b32' },
  resultSummary: { lineHeight: 21, marginTop: 2 },
  factors: { gap: 8, paddingTop: 4 },
  factor: { flexDirection: 'row', gap: 9 },
  factorBullet: { color: green },
  factorText: { flex: 1, lineHeight: 20 },
  sampleNote: { lineHeight: 19, paddingTop: 2 },
  disclaimer: { lineHeight: 19, marginTop: 4 },
});
