import type { MonthlyTransactionSummary } from '@/data/transactions';

export type SpendingGroup = 'essentials' | 'flexible' | 'savings' | 'other';
export type SpendingCategoryInsight = {
  category: string;
  averageMonthly: number;
  share: number;
  group: SpendingGroup;
};
export type SavingsScenario = {
  id: 'gentle' | 'balanced' | 'focused';
  title: string;
  description: string;
  reductionPercent: number;
  monthlyContribution: number;
  monthlyCut: number;
  monthsToGoal: number | null;
  reductions: { category: string; amount: number }[];
};
export type SpendingProfile = {
  type: 'Essentials-first' | 'Lifestyle-led' | 'Category-focused' | 'Balanced mix';
  description: string;
};
export type SavingsAnalysis = {
  monthsAvailable: number;
  monthsMissing: number;
  averageMonthlyIncome: number;
  averageMonthlySpending: number;
  medianMonthlySurplus: number;
  flexibleShare: number;
  essentialsShare: number;
  categories: SpendingCategoryInsight[];
  profile: SpendingProfile;
};

const categoryColors = {
  essentials: /housing|rent|mortgage|grocer|grocery|food|utility|utilities|health|medical|transport|fuel|insurance|education|home loan|electric|water/i,
  flexible: /restaurant|dining|entertainment|travel|lifestyle|shopping|fashion|hobby|leisure|cafe|coffee|beauty|electronics/i,
  savings: /invest|deposit|savings|investment/i,
};

function groupForCategory(category: string): SpendingGroup {
  if (categoryColors.savings.test(category)) return 'savings';
  if (categoryColors.essentials.test(category)) return 'essentials';
  if (categoryColors.flexible.test(category)) return 'flexible';
  return 'other';
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

export function analyzeSpendingHabits(
  monthlyData: Record<string, MonthlyTransactionSummary>,
  availableMonths: string[],
  requestedMonths: string[],
): SavingsAnalysis {
  const months = availableMonths.map((month) => monthlyData[month]).filter(Boolean);
  const monthsAvailable = months.length;
  const averageMonthlyIncome = monthsAvailable
    ? months.reduce((sum, month) => sum + month.income.total, 0) / monthsAvailable
    : 0;
  const averageMonthlySpending = monthsAvailable
    ? months.reduce((sum, month) => sum + month.spending.total, 0) / monthsAvailable
    : 0;
  const monthlySurpluses = months.map((month) => month.income.total - month.spending.total);
  const totals = new Map<string, number>();
  for (const month of months) {
    for (const item of month.spending.categories) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
    }
  }

  const categories = [...totals.entries()]
    .map(([category, total]) => ({
      category,
      averageMonthly: monthsAvailable ? total / monthsAvailable : 0,
      share: averageMonthlySpending > 0 ? total / (monthsAvailable * averageMonthlySpending) : 0,
      group: groupForCategory(category),
    }))
    .sort((a, b) => b.averageMonthly - a.averageMonthly);
  const flexibleShare = categories.filter((item) => item.group === 'flexible').reduce((sum, item) => sum + item.share, 0);
  const essentialsShare = categories.filter((item) => item.group === 'essentials').reduce((sum, item) => sum + item.share, 0);
  const topCategory = categories[0];

  let profile: SpendingProfile;
  if (essentialsShare >= 0.68) {
    profile = {
      type: 'Essentials-first',
      description: `${formatPercent(essentialsShare)} goes to essentials. A small automatic transfer may fit best.`,
    };
  } else if (flexibleShare >= 0.38) {
    profile = {
      type: 'Lifestyle-led',
      description: `${formatPercent(flexibleShare)} goes to flexible spending. That’s your biggest savings lever.`,
    };
  } else if (topCategory && topCategory.share >= 0.32) {
    profile = {
      type: 'Category-focused',
      description: `${topCategory.category} is your largest category at ${formatPercent(topCategory.share)}.`,
    };
  } else {
    profile = {
      type: 'Balanced mix',
      description: 'Your spending is spread across several categories.',
    };
  }

  return {
    monthsAvailable,
    monthsMissing: Math.max(0, requestedMonths.length - monthsAvailable),
    averageMonthlyIncome,
    averageMonthlySpending,
    medianMonthlySurplus: median(monthlySurpluses),
    flexibleShare,
    essentialsShare,
    categories,
    profile,
  };
}

export function buildSavingsScenarios(analysis: SavingsAnalysis, goalAmount: number): SavingsScenario[] {
  const targetCategories = analysis.categories.filter((item) => item.group === 'flexible').slice(0, 3);
  const options = [
    { id: 'gentle', title: 'Gentle', description: 'Small changes to a few flexible categories.', reductionPercent: 0.05 },
    { id: 'balanced', title: 'Balanced', description: 'A steady cut while keeping most routines.', reductionPercent: 0.1 },
    { id: 'focused', title: 'Goal focused', description: 'Reach the goal sooner with a larger adjustment.', reductionPercent: 0.2 },
  ] as const;

  return options.map((option) => {
    const reductions = targetCategories.map((item) => ({
      category: item.category,
      amount: item.averageMonthly * option.reductionPercent,
    }));
    const monthlyCut = reductions.reduce((sum, item) => sum + item.amount, 0);
    const monthlyContribution = Math.max(0, analysis.medianMonthlySurplus + monthlyCut);
    return {
      ...option,
      monthlyCut,
      monthlyContribution,
      monthsToGoal: monthlyContribution > 0 ? Math.ceil(goalAmount / monthlyContribution) : null,
      reductions,
    };
  });
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
