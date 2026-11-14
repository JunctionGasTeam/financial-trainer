import Constants from 'expo-constants';

import type { SavingsAnalysis } from '@/features/savings/plan';

const configuredApiUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (configuredApiUrl || (expoDevHost ? `http://${expoDevHost}:8787` : 'http://localhost:8787')).replace(/\/$/, '');

export type SavingsCoach = { insight: string; action: string; recommendedMonths: number };
export type SavingsCoachContext = {
  targetMonths: number;
  monthlyTarget: number;
  additionalCutNeeded: number;
  selectedScenario: string;
  plannedMonthlySaving: number;
  recommendedCuts: { category: string; amount: number }[];
};

export async function getSavingsCoach(
  goalAmount: number,
  analysis: SavingsAnalysis,
  balancedMonthlyContribution: number,
  timelineOptions: number[],
  context: SavingsCoachContext,
): Promise<SavingsCoach> {
  const response = await fetch(`${apiUrl}/api/savings-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goalAmount,
      profileType: analysis.profile.type,
      profileDescription: analysis.profile.description,
      averageMonthlyIncome: analysis.averageMonthlyIncome,
      averageMonthlySpending: analysis.averageMonthlySpending,
      medianMonthlySurplus: analysis.medianMonthlySurplus,
      balancedMonthlyContribution,
      ...context,
      timelineOptions: timelineOptions.map((months) => ({
        months,
        requiredMonthlySaving: Math.ceil(goalAmount / months),
        coveredByTypicalBalance: analysis.medianMonthlySurplus >= Math.ceil(goalAmount / months),
        coveredByBalancedPlan: balancedMonthlyContribution >= Math.ceil(goalAmount / months),
      })),
      topCategories: analysis.categories.slice(0, 6).map((item) => ({
        category: item.category,
        averageMonthly: item.averageMonthly,
        share: item.share,
      })),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Savings coach returned HTTP ${response.status}.`);
  if (typeof result.insight !== 'string' || typeof result.action !== 'string' || !timelineOptions.includes(result.recommendedMonths)) {
    throw new Error('Savings coach returned an invalid response.');
  }
  return result as SavingsCoach;
}
