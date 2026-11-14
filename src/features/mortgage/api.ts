import Constants from 'expo-constants';

import type { MortgagePredictionContext } from '@/data/mortgage';

const configuredApiUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (configuredApiUrl || (expoDevHost ? `http://${expoDevHost}:8787` : 'http://localhost:8787')).replace(/\/$/, '');

export type MortgagePrediction = {
  prediction: 'likely_approved' | 'uncertain' | 'higher_rejection_risk';
  confidence: 'low' | 'moderate' | 'high';
  summary: string;
  factors: string[];
  closestCasesSummary: string;
  applicantComparison: string;
  historicalSample: { totalCases: number; approvedCases: number; rejectedCases: number };
  similarCaseCount: number;
};

export async function predictMortgageApproval(context: MortgagePredictionContext): Promise<MortgagePrediction> {
  const response = await fetch(`${apiUrl}/api/mortgage-prediction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Mortgage prediction returned HTTP ${response.status}.`);
  if (!['likely_approved', 'uncertain', 'higher_rejection_risk'].includes(result.prediction) ||
    !['low', 'moderate', 'high'].includes(result.confidence) || typeof result.summary !== 'string' ||
    !Array.isArray(result.factors) || typeof result.closestCasesSummary !== 'string' ||
    typeof result.applicantComparison !== 'string' || !result.historicalSample ||
    !Number.isInteger(result.similarCaseCount)) {
    throw new Error('The mortgage prediction service returned an invalid response.');
  }
  return result as MortgagePrediction;
}
