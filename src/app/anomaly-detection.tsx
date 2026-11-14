import { useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getRecentTransactionData } from '@/data/transactions';
import { analyzeWithGemini, formatAnomalyMonth, type AgentResult } from '@/features/anomaly/api';
import { useTheme } from '@/hooks/use-theme';

const green = '#008044';
const analysts = ['Spending trend', 'Category shifts', 'Cash flow'];

export default function AnomalyDetectionScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [results, setResults] = useState<AgentResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    setBusy(true);
    setError('');
    try {
      const recentData = await getRecentTransactionData(db);
      if (recentData.window.availableMonths.length === 0) {
        throw new Error('No customer transactions were found in the last 12 months.');
      }
      const analysis = await analyzeWithGemini(recentData.monthlyData, recentData.window);
      setResults(analysis.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gemini analysis failed.');
      setResults(null);
    } finally {
      setBusy(false);
    }
  }

  const findingsCount = results?.reduce((count, result) => count + result.findings.length, 0) ?? 0;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close anomaly detection"
            hitSlop={12}
            onPress={() => router.back()}
            style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.closeGlyph, { color: theme.text }]}>×</Text>
          </Pressable>
          <ThemedText type="smallBold">Anomaly detection</ThemedText>
          <View style={styles.headerBalance} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eyebrow}>FINANCIAL TRAINER</ThemedText>
          <ThemedText type="title" style={styles.title}>Monthly patterns</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            Three Gemini analysts review your monthly spending categories, income, and cash flow for unusual behavior over the last 12 calendar months.
          </ThemedText>

          <View style={[styles.statusCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.statusIcon}><Text style={styles.sparkle}>✦</Text></View>
            <View style={styles.statusCopy}>
              <ThemedText type="smallBold">Gemini 4 Hydrogen · orchestrated</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                A coordinator assigns the review focus, then three analysts scan the data independently.
              </ThemedText>
            </View>
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={analyze} style={[styles.primaryButton, busy && styles.disabled]}>
            {busy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <ThemedText type="smallBold" style={styles.primaryText}>Three agents are analyzing…</ThemedText>
              </View>
            ) : (
              <ThemedText type="smallBold" style={styles.primaryText}>{results ? 'Analyze again' : 'Run AI analysis'}</ThemedText>
            )}
          </Pressable>

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText type="smallBold" style={styles.errorTitle}>Analysis unavailable</ThemedText>
              <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={styles.resultsHeading}>
            <ThemedText type="smallBold">Analyst results</ThemedText>
            {results ? <ThemedText type="small" themeColor="textSecondary">{findingsCount} {findingsCount === 1 ? 'pattern' : 'patterns'}</ThemedText> : null}
          </View>

          {results ? results.map((result) => (
            <View key={result.agent} style={[styles.agentCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.agentHeader}>
                <ThemedText type="smallBold" style={styles.agentName}>{result.agent}</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>{result.summary}</ThemedText>
              {result.findings.length === 0 ? (
                <ThemedText type="small" style={styles.clearText}>No clear unusual monthly changes found.</ThemedText>
              ) : result.findings.map((finding) => (
                <View key={finding.id} style={styles.finding}>
                  <ThemedText type="smallBold" style={styles.findingBullet}>•</ThemedText>
                  <ThemedText type="small" style={styles.findingCopy}>{formatAnomalyMonth(finding.month)}: {finding.bullet}</ThemedText>
                </View>
              ))}
            </View>
          )) : !error ? analysts.map((analyst) => (
            <View key={analyst} style={[styles.agentCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.agentHeader}>
                <ThemedText type="smallBold" style={styles.agentName}>{analyst}</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">Ready to analyze your monthly data.</ThemedText>
            </View>
          )) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            Gemini reviews aggregated monthly category totals. It does not inspect individual purchases or determine whether a transaction is unauthorized.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
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
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
  statusIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e2f3e8', alignItems: 'center', justifyContent: 'center' },
  sparkle: { color: green, fontSize: 24 },
  statusCopy: { flex: 1, gap: 4 },
  primaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: green, paddingHorizontal: 18 },
  primaryText: { color: '#fff' },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  disabled: { opacity: 0.65 },
  errorCard: { borderRadius: 16, padding: 14, backgroundColor: '#fcebea', gap: 5 },
  errorTitle: { color: '#a13b32' },
  errorText: { color: '#7c342d' },
  resultsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  agentCard: { borderRadius: 18, padding: 16, gap: 12 },
  agentHeader: { flexDirection: 'row', alignItems: 'center' },
  agentName: { color: green },
  summary: { lineHeight: 20 },
  clearText: { paddingTop: 4 },
  finding: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9e2dc' },
  findingBullet: { color: green },
  findingCopy: { flex: 1, lineHeight: 20 },
  disclaimer: { lineHeight: 18, marginTop: 3 },
});
