/**
 * Runs a validated query form over one customer's transactions. Pure code: every figure the
 * coach states after a lookup comes from here, not from the language model.
 */
import { basketLabels, classify, isRegularPharmacyBuyer, type Basket, type Bucket, type Transaction } from '@/features/baskets/rules';
import type { QueryForm } from '@/features/query/form';
import { merchantLabel, merchantTypeForMcc, merchantTypes } from '@/features/query/merchant-types';
import { addMonths, formatDate } from '@/features/safe-to-spend/calc';
import { formatEuro } from '@/features/safe-to-spend/format';

export type QueryRow = {
  date: string;
  merchant: string;
  category: string;
  basket: Basket | 'income' | 'transfer';
  amount: number;
};

export type QueryGroup = { key: string; label: string; amount: number; count: number; share: number };

export type QueryResult = {
  /** Plain description of what was counted, so the model can word the answer. */
  what: string;
  measure: QueryForm['measure'];
  period: { from: string; to: string; label: string };
  total: number;
  count: number;
  averagePerTransaction: number;
  monthlyAverage: number;
  groups?: QueryGroup[];
  comparison?: {
    against: string;
    period: { from: string; to: string; label: string } | null;
    total: number;
    difference: number;
    percentChange: number | null;
  };
  whatIf?: { cutPercent: number; baseMonthly: number; monthlySaving: number; yearlySaving: number };
  /** The rows behind the figure: the largest first for `largest`, otherwise newest first. */
  transactions: QueryRow[];
  transactionsOmitted: number;
  /** Template answer, used when the model's wording fails the number check. */
  summary: string;
};

type Range = { from: string; to: string };

const DAY_MS = 86_400_000;
const AVERAGE_MONTH_DAYS = 365.25 / 12;
const MAX_ROWS = 10;
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const transferCategories = new Set(['Invest Deposit', 'Invest Withdraw', 'Salary Sweep']);

export function runQuery(allTransactions: Transaction[], form: QueryForm, asOf: string): QueryResult {
  const transactions = allTransactions.filter((tx) => tx.date <= asOf);
  const asOfMonth = asOf.slice(0, 7);
  const referenceMonths = Array.from({ length: 6 }, (_, index) => addMonths(asOfMonth, index - 6));
  const context = { regularPharmacyBuyer: isRegularPharmacyBuyer(transactions, referenceMonths) };
  const bucketOf = (tx: Transaction): Bucket => classify(tx, context);

  const range = resolvePeriod(form, asOf, transactions[0]?.date ?? asOf);
  const matches = (tx: Transaction) => matchesFilters(tx, form, bucketOf(tx));
  const inRange = (tx: Transaction, r: Range) => tx.date >= r.from && tx.date <= r.to;
  const rows = transactions.filter((tx) => inRange(tx, range) && matches(tx));
  const total = measureTotal(rows, form);
  const months = monthCount(range);
  const what = describeFilters(form);

  const result: QueryResult = {
    what,
    measure: form.measure,
    period: { ...range, label: periodLabel(range) },
    total: round2(total),
    count: rows.length,
    averagePerTransaction: rows.length ? round2(total / rows.length) : 0,
    monthlyAverage: round2(total / months),
    transactions: [],
    transactionsOmitted: 0,
    summary: '',
  };

  if (form.group_by !== 'none') result.groups = groupRows(rows, form, range, bucketOf, total);

  if (form.compare_to !== 'none') {
    if (form.compare_to === 'my_usual') {
      // Usual month: average of the 6 calendar months before the period starts.
      const firstMonth = range.from.slice(0, 7);
      const usualRange = { from: `${addMonths(firstMonth, -6)}-01`, to: lastDayOfMonth(addMonths(firstMonth, -1)) };
      const usualMonthly = measureTotal(transactions.filter((tx) => inRange(tx, usualRange) && matches(tx)), form) / 6;
      const usual = usualMonthly * months;
      result.comparison = {
        against: `your usual level (average month of ${periodLabel(usualRange)}, scaled to this period)`,
        period: { ...usualRange, label: periodLabel(usualRange) },
        ...difference(total, usual),
      };
    } else {
      const other = form.compare_to === 'previous_period' ? previousPeriod(range, form) : lastYear(range);
      const otherTotal = measureTotal(transactions.filter((tx) => inRange(tx, other) && matches(tx)), form);
      result.comparison = {
        against: form.compare_to === 'previous_period' ? 'the previous period' : 'the same period last year',
        period: { ...other, label: periodLabel(other) },
        ...difference(total, otherTotal),
      };
    }
  }

  if (form.what_if) {
    const baseMonthly = total / months;
    const monthlySaving = baseMonthly * form.what_if.cut_percent / 100;
    result.whatIf = {
      cutPercent: form.what_if.cut_percent,
      baseMonthly: round2(baseMonthly),
      monthlySaving: round2(monthlySaving),
      yearlySaving: round2(monthlySaving * 12),
    };
  }

  const ordered = form.measure === 'largest'
    ? [...rows].filter((tx) => tx.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, form.limit)
    : [...rows].reverse();
  result.transactions = ordered.slice(0, MAX_ROWS).map((tx) => ({
    date: tx.date,
    merchant: merchantLabel(tx.mccCode, tx.category),
    category: tx.category,
    basket: bucketOf(tx),
    amount: round2(tx.amount),
  }));
  result.transactionsOmitted = form.measure === 'largest' ? 0 : Math.max(0, rows.length - MAX_ROWS);
  result.summary = summarize(result);
  return result;
}

function matchesFilters(tx: Transaction, form: QueryForm, bucket: Bucket) {
  const { filters, measure } = form;
  if (measure === 'income' && tx.amount <= 0) return false;
  if ((measure === 'spend' || measure === 'largest') && tx.amount >= 0) return false;
  // Moving money to savings is not spending, unless the question names that category.
  if ((measure === 'spend' || measure === 'largest') && bucket === 'transfer' &&
    !filters.category.some((category) => transferCategories.has(category))) return false;
  if (filters.basket.length && !filters.basket.includes(bucket as Basket)) return false;
  if (filters.category.length && !filters.category.includes(tx.category as QueryForm['filters']['category'][number])) return false;
  if (filters.merchant_type.length) {
    const type = merchantTypeForMcc(tx.mccCode);
    if (!type || !filters.merchant_type.includes(type)) return false;
  }
  const size = Math.abs(tx.amount);
  if (filters.min_amount != null && size < filters.min_amount) return false;
  if (filters.max_amount != null && size > filters.max_amount) return false;
  return true;
}

/** Spend and income are positive totals; net is money in minus money out. */
function measureTotal(rows: Transaction[], form: QueryForm) {
  if (form.measure === 'net') return rows.reduce((sum, tx) => sum + tx.amount, 0);
  return rows.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

function groupRows(rows: Transaction[], form: QueryForm, range: Range, bucketOf: (tx: Transaction) => Bucket, total: number) {
  const groups = new Map<string, { label: string; amount: number; count: number }>();
  const add = (key: string, label: string, tx: Transaction | null) => {
    const group = groups.get(key) ?? { label, amount: 0, count: 0 };
    if (tx) {
      group.amount += form.measure === 'net' ? tx.amount : Math.abs(tx.amount);
      group.count += 1;
    }
    groups.set(key, group);
  };

  if (form.group_by === 'month') {
    for (let month = range.from.slice(0, 7); month <= range.to.slice(0, 7); month = addMonths(month, 1)) {
      add(month, monthLabel(month), null);
    }
  }
  if (form.group_by === 'weekday') weekdays.forEach((name) => add(name, name, null));

  for (const tx of rows) {
    switch (form.group_by) {
      case 'basket': {
        const bucket = bucketOf(tx);
        add(bucket, bucket in basketLabels ? basketLabels[bucket as Basket] : bucket === 'income' ? 'Income' : 'Transfers', tx);
        break;
      }
      case 'category':
        add(tx.category, tx.category, tx);
        break;
      case 'merchant_type': {
        const type = merchantTypeForMcc(tx.mccCode);
        add(type ?? tx.category, merchantLabel(tx.mccCode, tx.category), tx);
        break;
      }
      case 'month':
        add(tx.date.slice(0, 7), monthLabel(tx.date.slice(0, 7)), tx);
        break;
      case 'weekday': {
        const name = weekdays[(new Date(`${tx.date}T00:00:00Z`).getUTCDay() + 6) % 7];
        add(name, name, tx);
        break;
      }
    }
  }

  const list = [...groups.entries()].map(([key, group]) => ({
    key,
    label: group.label,
    amount: round2(group.amount),
    count: group.count,
    share: total ? Math.round((group.amount / total) * 1000) / 1000 : 0,
  }));
  // Time groupings keep calendar order; the rest are ranked.
  return form.group_by === 'month' || form.group_by === 'weekday' ? list : list.sort((a, b) => b.amount - a.amount).slice(0, 15);
}

function difference(current: number, other: number) {
  return {
    total: round2(other),
    difference: round2(current - other),
    percentChange: other ? Math.round(((current - other) / Math.abs(other)) * 1000) / 10 : null,
  };
}

function resolvePeriod(form: QueryForm, asOf: string, firstDate: string): Range {
  const asOfMonth = asOf.slice(0, 7);
  const year = Number(asOf.slice(0, 4));
  const monday = shiftDays(asOf, -((new Date(`${asOf}T00:00:00Z`).getUTCDay() + 6) % 7));
  const lastMonths = (count: number) => ({ from: `${addMonths(asOfMonth, 1 - count)}-01`, to: asOf });
  switch (form.period) {
    case 'this_week': return { from: monday, to: asOf };
    case 'last_week': return { from: shiftDays(monday, -7), to: shiftDays(monday, -1) };
    case 'this_month': return { from: `${asOfMonth}-01`, to: asOf };
    case 'last_month': {
      const month = addMonths(asOfMonth, -1);
      return { from: `${month}-01`, to: lastDayOfMonth(month) };
    }
    case 'last_3_months': return lastMonths(3);
    case 'last_6_months': return lastMonths(6);
    case 'last_12_months': return lastMonths(12);
    case 'this_year': return { from: `${year}-01-01`, to: asOf };
    case 'last_year': return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case 'all_time': return { from: firstDate, to: asOf };
    case 'custom': return { from: form.from!, to: form.to! < asOf ? form.to! : asOf };
  }
}

function previousPeriod(range: Range, form: QueryForm): Range {
  if (form.period === 'this_week' || form.period === 'last_week') {
    return { from: shiftDays(range.from, -7), to: shiftDays(range.from, -1) };
  }
  if (isMonthAligned(range)) {
    const count = monthCount(range);
    const firstMonth = addMonths(range.from.slice(0, 7), -count);
    return { from: `${firstMonth}-01`, to: lastDayOfMonth(addMonths(firstMonth, count - 1)) };
  }
  const days = daysInRange(range);
  return { from: shiftDays(range.from, -days), to: shiftDays(range.from, -1) };
}

function lastYear(range: Range): Range {
  const shift = (date: string) => {
    const previous = `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`;
    return previous.endsWith('-02-29') ? previous.replace('-02-29', '-02-28') : previous;
  };
  return { from: shift(range.from), to: shift(range.to) };
}

/** Whole calendar months: starts on the 1st and ends on a month's last day. */
function isMonthAligned(range: Range) {
  return range.from.endsWith('-01') && range.to === lastDayOfMonth(range.to.slice(0, 7));
}

function monthCount(range: Range) {
  if (isMonthAligned(range)) {
    const [fromYear, fromMonth] = range.from.split('-').map(Number);
    const [toYear, toMonth] = range.to.split('-').map(Number);
    return (toYear - fromYear) * 12 + toMonth - fromMonth + 1;
  }
  return Math.max(daysInRange(range) / AVERAGE_MONTH_DAYS, 1 / AVERAGE_MONTH_DAYS);
}

function periodLabel(range: Range) {
  const fromMonth = range.from.slice(0, 7);
  const toMonth = range.to.slice(0, 7);
  if (range.from.endsWith('-01') && range.to === lastDayOfMonth(toMonth)) {
    if (fromMonth === toMonth) return monthLabel(fromMonth);
    if (range.from.slice(5) === '01-01' && range.to.slice(5) === '12-31' && range.from.slice(0, 4) === range.to.slice(0, 4)) {
      return range.from.slice(0, 4);
    }
    return range.from.slice(0, 4) === range.to.slice(0, 4)
      ? `${monthNames[Number(fromMonth.slice(5)) - 1]} to ${monthLabel(toMonth)}`
      : `${monthLabel(fromMonth)} to ${monthLabel(toMonth)}`;
  }
  return range.from === range.to ? formatDate(range.from) : `${formatDate(range.from)} to ${formatDate(range.to)}`;
}

function describeFilters(form: QueryForm) {
  const { filters } = form;
  const parts = [
    ...filters.merchant_type.map((key) => merchantTypes[key].label.toLowerCase()),
    ...(filters.merchant_type.length ? [] : filters.category.map((category) => category.toLowerCase())),
    ...filters.basket.map((basket) => basketLabels[basket].toLowerCase()),
  ];
  let what = parts.length ? parts.join(' and ') : form.measure === 'income' ? 'all income' : 'everything';
  if (filters.min_amount != null) what += ` (each at least ${formatEuro(filters.min_amount, 2)})`;
  if (filters.max_amount != null) what += ` (each at most ${formatEuro(filters.max_amount, 2)})`;
  return what;
}

function summarize(result: QueryResult) {
  const euros = (value: number) => formatEuro(value, 2);
  const period = result.period.label;
  const sentences: string[] = [];
  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
  switch (result.measure) {
    case 'spend':
      sentences.push(`You spent ${euros(result.total)} on ${result.what} in ${period}, across ${count(result.count, 'purchase')}.`);
      break;
    case 'income':
      sentences.push(`You received ${euros(result.total)} (${result.what}) in ${period}, across ${count(result.count, 'payment')}.`);
      break;
    case 'net':
      sentences.push(`Money in minus money out in ${period} was ${euros(result.total)}.`);
      break;
    case 'largest': {
      const top = result.transactions[0];
      sentences.push(top
        ? `Your largest purchase (${result.what}) in ${period} was ${euros(-top.amount)} at ${top.merchant.toLowerCase()} on ${formatDate(top.date)}.`
        : `I found no purchases (${result.what}) in ${period}.`);
      break;
    }
  }
  if (result.comparison) {
    const { comparison } = result;
    const direction = comparison.difference > 0 ? 'more than' : comparison.difference < 0 ? 'less than' : 'the same as';
    sentences.push(comparison.difference === 0
      ? `That is the same as ${comparison.against}.`
      : `That is ${euros(Math.abs(comparison.difference))} ${direction} ${comparison.against} (${euros(comparison.total)}).`);
  }
  if (result.whatIf) {
    sentences.push(`Cutting it by ${result.whatIf.cutPercent}% would save about ${euros(result.whatIf.monthlySaving)} a month, ${euros(result.whatIf.yearlySaving)} a year.`);
  }
  return sentences.join(' ');
}

function monthLabel(month: string) {
  return `${monthNames[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, '0')}`;
}

function shiftDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysInRange(range: Range) {
  return Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / DAY_MS) + 1;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
