import type { SafeToSpend } from '@/features/safe-to-spend/calc';

/** Amounts use a space as thousands separator and always show the currency (SPEC.md section 11). */
export function formatEuro(value: number, decimals = 0) {
  const sign = value < 0 ? '−' : '';
  const [whole, fraction] = Math.abs(value).toFixed(decimals).split('.');
  return `${sign}€${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${fraction ? `.${fraction}` : ''}`;
}

/** Plain-English comparison of the weekly pace against the customer's usual week. */
export function coachLine(result: SafeToSpend) {
  const usual = Math.round(result.usualWeeklyEveryday / 10) * 10;
  if (result.status === 'shortfall') {
    return 'Your bills before payday are larger than your balance. Hold off on anything that can wait.';
  }
  if (result.status === 'well_covered') {
    return `Your usual week of everyday spending is about ${formatEuro(usual)}, so you have room to put more aside.`;
  }
  const weekly = `At this pace you have about ${formatEuro(result.displayPerWeek)} a week`;
  const difference = Math.round(Math.abs(result.usualWeeklyEveryday - result.perWeek) / 10) * 10;
  if (difference === 0) return `${weekly}, about the same as your usual week of ${formatEuro(usual)}.`;
  return result.status === 'tight'
    ? `${weekly}, about ${formatEuro(difference)} less than your usual week of ${formatEuro(usual)}.`
    : `${weekly}, about ${formatEuro(difference)} more than your usual week of ${formatEuro(usual)}.`;
}

export function lateSalaryLine(result: SafeToSpend) {
  const late = result.lateSalary;
  if (!late || late.safeTotal >= 0 || result.status === 'shortfall') return null;
  return `${late.lateCount} of your ${late.salaryCount} salaries arrived at month end. If the next one does, you would be ${formatEuro(-late.safeTotal, 2)} short.`;
}
