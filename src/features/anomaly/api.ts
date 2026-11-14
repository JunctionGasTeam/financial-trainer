import { apiUrl } from '@/features/api-url';
import type { AnalysisWindow, MonthlyTransactionSummary } from '@/data/transactions';

export type Finding = {
  id: string;
  month: string;
  bullet: string;
};

export type AgentResult = {
  agent: string;
  summary: string;
  findings: Finding[];
};

export type GeminiAnalysis = {
  results: AgentResult[];
  model: string;
  workflow: string;
};

export async function analyzeWithGemini(
  monthlyData: Record<string, MonthlyTransactionSummary>,
  window: AnalysisWindow,
): Promise<GeminiAnalysis> {
  const response = await fetch(`${apiUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthlyData, window }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Analysis server returned HTTP ${response.status}.`);
  if (!Array.isArray(result.results)) {
    throw new Error('The analysis server returned an invalid response.');
  }
  return result as GeminiAnalysis;
}

export function formatAnomalyMonth(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
