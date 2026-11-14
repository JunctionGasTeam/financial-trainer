/**
 * The query form (docs/SPEC.md 7.2). The language model only fills this in; code validates it
 * and computes every number, so the model cannot make up a figure.
 */
import type { Basket } from '@/features/baskets/rules';
import { merchantTypes, type MerchantType } from '@/features/query/merchant-types';

export const categories = [
  'Housing', 'Utilities', 'Groceries', 'Transportation', 'Health', 'Home & Tech', 'Restaurants',
  'Entertainment', 'Lifestyle', 'Travel', 'Salary', 'Other Income', 'Invest Deposit', 'Invest Withdraw', 'Salary Sweep',
] as const;
export const measures = ['spend', 'income', 'net', 'largest'] as const;
export const baskets = ['regular', 'irregular', 'everyday'] as const;
export const periods = [
  'this_week', 'last_week', 'this_month', 'last_month', 'last_3_months', 'last_6_months', 'last_12_months',
  'this_year', 'last_year', 'all_time', 'custom',
] as const;
export const groupings = ['none', 'basket', 'category', 'merchant_type', 'month', 'weekday'] as const;
export const comparisons = ['none', 'previous_period', 'same_period_last_year', 'my_usual'] as const;

export type Category = (typeof categories)[number];
export type Measure = (typeof measures)[number];
export type Period = (typeof periods)[number];
export type GroupBy = (typeof groupings)[number];
export type CompareTo = (typeof comparisons)[number];

export type QueryForm = {
  measure: Measure;
  filters: {
    basket: Basket[];
    category: Category[];
    merchant_type: MerchantType[];
    min_amount: number | null;
    max_amount: number | null;
  };
  period: Period;
  from: string | null;
  to: string | null;
  group_by: GroupBy;
  compare_to: CompareTo;
  /** Cut the matching spending by this percentage and report the saving. */
  what_if: { cut_percent: number } | null;
  /** How many rows `largest` returns. */
  limit: number;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T | undefined {
  if (value == null) return fallback;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function listOf<T extends string>(allowed: readonly T[], value: unknown): T[] | undefined {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  if (items.length > 12 || !items.every((item) => allowed.includes(item as T))) return undefined;
  return [...new Set(items as T[])];
}

function amountOrNull(value: unknown): number | null | undefined {
  if (value == null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Returns a valid form, or a reason the model's form was rejected. */
export function parseQueryForm(input: unknown): { form: QueryForm } | { error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'The query is not an object.' };
  const raw = input as Record<string, unknown>;
  const rawFilters = (raw.filters && typeof raw.filters === 'object' ? raw.filters : {}) as Record<string, unknown>;

  const measure = oneOf(measures, raw.measure, 'spend');
  if (!measure) return { error: `Unknown measure "${String(raw.measure)}".` };
  const basket = listOf(baskets, rawFilters.basket);
  if (!basket) return { error: 'Unknown basket in filters.' };
  const category = listOf(categories, rawFilters.category);
  if (!category) return { error: 'Unknown category in filters.' };
  const merchantType = listOf(Object.keys(merchantTypes) as MerchantType[], rawFilters.merchant_type);
  if (!merchantType) return { error: 'Unknown merchant_type in filters.' };
  const minAmount = amountOrNull(rawFilters.min_amount);
  const maxAmount = amountOrNull(rawFilters.max_amount);
  if (minAmount === undefined || maxAmount === undefined) return { error: 'Amount limits must be positive numbers.' };

  const period = oneOf(periods, raw.period, 'last_month');
  if (!period) return { error: `Unknown period "${String(raw.period)}".` };
  const from = typeof raw.from === 'string' && datePattern.test(raw.from) ? raw.from : null;
  const to = typeof raw.to === 'string' && datePattern.test(raw.to) ? raw.to : null;
  if (period === 'custom' && (!from || !to || from > to)) return { error: 'A custom period needs from and to dates (YYYY-MM-DD).' };

  const groupBy = oneOf(groupings, raw.group_by, 'none');
  if (!groupBy) return { error: `Unknown group_by "${String(raw.group_by)}".` };
  const compareTo = oneOf(comparisons, raw.compare_to, 'none');
  if (!compareTo) return { error: `Unknown compare_to "${String(raw.compare_to)}".` };

  let whatIf: QueryForm['what_if'] = null;
  if (raw.what_if != null) {
    const percent = (raw.what_if as Record<string, unknown>)?.cut_percent;
    if (typeof percent !== 'number' || !(percent > 0 && percent <= 100)) return { error: 'what_if.cut_percent must be between 0 and 100.' };
    whatIf = { cut_percent: percent };
  }

  const limit = typeof raw.limit === 'number' && Number.isInteger(raw.limit) ? Math.min(Math.max(raw.limit, 1), 10) : 5;

  return {
    form: {
      measure,
      filters: { basket, category, merchant_type: merchantType, min_amount: minAmount, max_amount: maxAmount },
      period,
      from: period === 'custom' ? from : null,
      to: period === 'custom' ? to : null,
      group_by: groupBy,
      compare_to: compareTo,
      what_if: whatIf,
      limit,
    },
  };
}
