import { monthlyTransactionSummary } from '@/data/transaction-summary';
import Constants from 'expo-constants';

export type Finding = {
  id: string;
  month: string;
  title: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
};

export type AgentResult = {
  agent: string;
  summary: string;
  findings: Finding[];
};

export type GeminiAnalysis = {
  results: AgentResult[];
  overallSummary: string;
  model: string;
  workflow: string;
};

export type AnalysisWindow = {
  startMonth: string;
  endMonth: string;
  requestedMonths: string[];
  availableMonths: string[];
  missingMonths: string[];
};

const configuredApiUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (configuredApiUrl || (expoDevHost ? `http://${expoDevHost}:8787` : 'http://localhost:8787')).replace(/\/$/, '');

export function getCurrentAnalysisWindow(now = new Date()): AnalysisWindow {
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11, 1);
  const requestedMonths = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  });
  const availableMonths = requestedMonths.filter((month) => Object.hasOwn(monthlyTransactionSummary, month));
  const missingMonths = requestedMonths.filter((month) => !availableMonths.includes(month));

  return {
    startMonth: requestedMonths[0],
    endMonth: requestedMonths[requestedMonths.length - 1],
    requestedMonths,
    availableMonths,
    missingMonths,
  };
}

export async function analyzeWithGemini(window: AnalysisWindow): Promise<GeminiAnalysis> {
  const monthlyData = Object.fromEntries(
    window.availableMonths.map((month) => [month, monthlyTransactionSummary[month]]),
  );
  const response = await fetch(`${apiUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthlyData, window }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Analysis server returned HTTP ${response.status}.`);
  if (!Array.isArray(result.results) || typeof result.overallSummary !== 'string') {
    throw new Error('The analysis server returned an invalid response.');
  }
  return result as GeminiAnalysis;
}

export function formatAnomalyMonth(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
