import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { analyzeWithGemini, formatAnomalyMonth, getCurrentAnalysisWindow, type AgentResult, type AnalysisWindow } from '@/features/anomaly/api';
import { useTheme } from '@/hooks/use-theme';

const green = '#008044';
const analysts = ['Spending trend', 'Category shifts', 'Cash flow'];

export default function AnomalyDetectionScreen() {
  const theme = useTheme();
  const [results, setResults] = useState<AgentResult[] | null>(null);
  const [orchestratorSummary, setOrchestratorSummary] = useState('');
  const [analysisWindow, setAnalysisWindow] = useState<AnalysisWindow>(() => getCurrentAnalysisWindow());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function analyze() {
    setBusy(true);
    setError('');
    const window = getCurrentAnalysisWindow();
    setAnalysisWindow(window);
    try {
      const analysis = await analyzeWithGemini(window);
      setResults(analysis.results);
      setOrchestratorSummary(analysis.overallSummary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gemini analysis failed.');
      setResults(null);
      setOrchestratorSummary('');
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
                A coordinator plans the review, three analysts scan the data, then the coordinator summarizes their findings.
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.periodNote}>
            {formatAnomalyMonth(analysisWindow.startMonth)} – {formatAnomalyMonth(analysisWindow.endMonth)} · {analysisWindow.availableMonths.length} of 12 months have transaction data.
            {analysisWindow.missingMonths.length > 0 ? ` Missing data: ${analysisWindow.missingMonths.map(formatAnomalyMonth).join(', ')}.` : ''}
          </ThemedText>

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

          {orchestratorSummary ? (
            <View style={[styles.agentCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.agentHeader}>
                <ThemedText type="smallBold" style={styles.agentName}>Hydrogen orchestrator</ThemedText>
                <View style={styles.agentPill}><ThemedText type="small" style={styles.agentPillText}>FINAL REVIEW</ThemedText></View>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>{orchestratorSummary}</ThemedText>
            </View>
          ) : null}

          {results ? results.map((result) => (
            <View key={result.agent} style={[styles.agentCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.agentHeader}>
                <ThemedText type="smallBold" style={styles.agentName}>{result.agent}</ThemedText>
                <View style={styles.agentPill}><ThemedText type="small" style={styles.agentPillText}>HYDROGEN AGENT</ThemedText></View>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>{result.summary}</ThemedText>
              {result.findings.length === 0 ? (
                <ThemedText type="small" style={styles.clearText}>No clear unusual monthly changes found.</ThemedText>
              ) : result.findings.map((finding) => (
                <View key={finding.id} style={styles.finding}>
                  <View style={[styles.findingMark, finding.severity === 'high' && styles.highSeverity]} />
                  <View style={styles.findingCopy}>
                    <ThemedText type="smallBold">{finding.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{finding.detail}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{formatAnomalyMonth(finding.month)}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )) : !error ? analysts.map((analyst) => (
            <View key={analyst} style={[styles.agentCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.agentHeader}>
                <ThemedText type="smallBold" style={styles.agentName}>{analyst}</ThemedText>
                <View style={styles.agentPill}><ThemedText type="small" style={styles.agentPillText}>HYDROGEN AGENT</ThemedText></View>
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
  periodNote: { lineHeight: 19, paddingHorizontal: 2 },
  primaryButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: green, paddingHorizontal: 18 },
  primaryText: { color: '#fff' },
  loadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  disabled: { opacity: 0.65 },
  errorCard: { borderRadius: 16, padding: 14, backgroundColor: '#fcebea', gap: 5 },
  errorTitle: { color: '#a13b32' },
  errorText: { color: '#7c342d' },
  resultsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  agentCard: { borderRadius: 18, padding: 16, gap: 12 },
  agentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agentName: { color: green },
  agentPill: { backgroundColor: '#e2f3e8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  agentPillText: { color: green, letterSpacing: 0.5 },
  summary: { lineHeight: 20 },
  clearText: { paddingTop: 4 },
  finding: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d9e2dc' },
  findingMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d5a338', marginTop: 6 },
  highSeverity: { backgroundColor: '#c33c36' },
  findingCopy: { flex: 1, gap: 5 },
  disclaimer: { lineHeight: 18, marginTop: 3 },
});
