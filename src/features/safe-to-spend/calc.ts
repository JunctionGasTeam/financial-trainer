/**
 * Safe-to-spend, docs/SPEC.md sections 6.1 to 6.3. Pure function over one
 * customer's transactions so it can be checked against the spec's worked example.
 */
import { classify, isRegularPharmacyBuyer, type Bucket, type Transaction } from '@/features/baskets/rules';

export type SafeToSpendLine = {
  key: 'balance' | 'housing' | 'utilities' | 'groceries' | 'buffer' | 'savings';
  label: string;
  amount: number;
  source: string;
};

export type SafeToSpendStatus = 'shortfall' | 'tight' | 'ok' | 'well_covered';

export type SafeToSpendPeriod = 'day' | 'month';

export type SafeToSpend = {
  asOf: string;
  payday: string;
  days: number;
  paydaySource: string;
  lines: SafeToSpendLine[];
  safeTotal: number;
  perWeek: number;
  /** Rounded down to the nearest EUR 5, never below 0. */
  displayPerWeek: number;
  /** safeTotal spread evenly over the days until payday. */
  perDay: number;
  /** Rounded down to the nearest EUR 1, never below 0. */
  displayPerDay: number;
  /** Monthly pace: perDay times 30. */
  perMonth: number;
  /** Rounded down to the nearest EUR 5, never below 0. */
  displayPerMonth: number;
  /** Expected shortfall before payday when safeTotal is negative, otherwise 0. */
  shortfall: number;
  usualWeeklyEveryday: number;
  status: SafeToSpendStatus;
  /** What happens if the salary arrives at month end instead, when that has happened before. */
  lateSalary: { payday: string; lateCount: number; salaryCount: number; safeTotal: number } | null;
};

const BUFFER_CAP_EUR = 5000;
const DAY_MS = 86_400_000;

export function computeSafeToSpend(
  allTransactions: Transaction[],
  asOf: string,
  options: { savingsTarget?: number; bucketOf?: (tx: Transaction) => Bucket } = {},
): SafeToSpend | null {
  const transactions = allTransactions.filter((tx) => tx.date <= asOf);
  if (transactions.length === 0) return null;

  const asOfMonth = asOf.slice(0, 7);
  const referenceMonths = Array.from({ length: 6 }, (_, index) => addMonths(asOfMonth, index - 6));
  const context = { regularPharmacyBuyer: isRegularPharmacyBuyer(transactions, referenceMonths) };
  // The caller passes the shared classifier so the user's basket moves count here too.
  const bucketOf = options.bucketOf ?? ((tx: Transaction) => classify(tx, context));
  const debits = transactions.filter((tx) => tx.amount < 0);
  const usualMonthly = (match: (tx: Transaction) => boolean) => median(
    referenceMonths.map((month) => sum(debits.filter((tx) => tx.date.startsWith(month) && match(tx)).map((tx) => -tx.amount))),
  );

  // Balance: last transaction on or before the as-of date (input is chronological).
  const last = transactions[transactions.length - 1];
  const balance = last.balanceAfter;

  // Payday (6.2).
  const salaries = transactions.filter((tx) => tx.category === 'Salary' && tx.amount > 0);
  const on15 = salaries.filter((tx) => day(tx.date) === 15).length;
  const lateCount = salaries.filter((tx) => day(tx.date) >= 26).length;
  const midMonth = salaries.length > 0 && on15 * 2 >= salaries.length;
  const paidThisMonth = salaries.some((tx) => tx.date.startsWith(asOfMonth));
  const payday = nextPayday(asOf, midMonth, paidThisMonth);
  const paydaySource = salaries.length === 0
    ? 'No salary found, month end assumed'
    : midMonth
      ? `${on15} of ${salaries.length} salaries arrived on the 15th`
      : `${salaries.length - on15} of ${salaries.length} salaries arrived after the 15th`;

  // Housing (6.3): median of the last 3 payments, once per unpaid month due before payday.
  const housing = debits.filter((tx) => tx.category === 'Housing');
  const lastThree = housing.slice(-3).map((tx) => -tx.amount);
  const housingAmount = lastThree.length > 0 ? median(lastThree) : 0;

  // Running costs and buffer.
  const utilitiesMonthly = usualMonthly((tx) => tx.category === 'Utilities');
  const essentialsMonthly = usualMonthly((tx) =>
    (tx.category === 'Groceries' || tx.category === 'Transportation') && bucketOf(tx) === 'regular');
  const historyMonths = monthsBetween(transactions[0].date.slice(0, 7), asOfMonth);
  const irregularTotal = sum(debits.filter((tx) => bucketOf(tx) === 'irregular')
    .map((tx) => Math.min(-tx.amount, BUFFER_CAP_EUR)));
  const irregularMonthly = irregularTotal / historyMonths;

  // Savings reserve: usual monthly investment deposit minus what already went in since the last salary.
  const savingsTarget = options.savingsTarget ?? usualMonthly((tx) => tx.category === 'Invest Deposit');
  const lastSalaryDate = salaries.at(-1)?.date ?? asOf;
  const depositedSinceSalary = sum(debits
    .filter((tx) => tx.category === 'Invest Deposit' && tx.date >= lastSalaryDate)
    .map((tx) => -tx.amount));
  const savingsReserve = Math.max(0, savingsTarget - depositedSinceSalary);

  const usualWeeklyEveryday = usualMonthly((tx) => bucketOf(tx) === 'everyday') * 7 / 30;

  const build = (paydayDate: string) => {
    const days = Math.max(1, daysBetween(asOf, paydayDate));
    const dueMonths = monthsInRange(asOfMonth, paydayDate.slice(0, 7)).filter((month) =>
      `${month}-01` < paydayDate && !housing.some((tx) => tx.date.startsWith(month)));
    const housingDue = housingAmount * dueMonths.length;
    const share = days / 30;
    const lines: SafeToSpendLine[] = [
      { key: 'balance', label: 'Balance', amount: balance, source: `Last transaction, ${formatDate(last.date)}` },
      {
        key: 'housing', label: 'Housing due', amount: -housingDue,
        source: dueMonths.length === 0
          ? (housing.length === 0 ? 'No housing payments in your history' : 'Already paid before payday')
          : `Median of your last ${lastThree.length} payments (${lastThree.map(formatPlain).join(', ')}), due in ${dueMonths.map(formatMonth).join(', ')}`,
      },
      {
        key: 'utilities', label: 'Utilities', amount: -utilitiesMonthly * share,
        source: `Usual ${formatPlain(utilitiesMonthly)} a month, ${days} of 30 days`,
      },
      {
        key: 'groceries', label: 'Groceries and essential transport', amount: -essentialsMonthly * share,
        source: `Usual ${formatPlain(essentialsMonthly)} a month, ${days} of 30 days`,
      },
      {
        key: 'buffer', label: 'Buffer for surprises', amount: -irregularMonthly * share,
        source: `${formatPlain(irregularTotal)} of unexpected costs over ${historyMonths} months is ${formatPlain(irregularMonthly)} a month, ${days} of 30 days`,
      },
      {
        key: 'savings', label: 'Savings reserve', amount: -savingsReserve,
        source: savingsTarget === 0
          ? 'No investment deposits in your recent months'
          : `Usual ${formatPlain(savingsTarget)} a month, ${formatPlain(depositedSinceSalary)} already put aside since payday`,
      },
    ];
    const safeTotal = sum(lines.map((line) => line.amount));
    return { days, lines, safeTotal };
  };

  const { days, lines, safeTotal } = build(payday);
  const perWeek = days < 7 ? safeTotal : safeTotal / days * 7;
  const displayPerWeek = Math.max(0, Math.floor(perWeek / 5) * 5);
  const perDay = safeTotal / days;
  const perMonth = perDay * 30;
  const status: SafeToSpendStatus = safeTotal < 0
    ? 'shortfall'
    : usualWeeklyEveryday > 0 && displayPerWeek > 2 * usualWeeklyEveryday
      ? 'well_covered'
      : perWeek < usualWeeklyEveryday ? 'tight' : 'ok';

  let lateSalary: SafeToSpend['lateSalary'] = null;
  if (midMonth && lateCount > 0) {
    const latePayday = lastDayOfMonth(payday.slice(0, 7));
    lateSalary = { payday: latePayday, lateCount, salaryCount: salaries.length, safeTotal: build(latePayday).safeTotal };
  }

  return {
    asOf,
    payday,
    days,
    paydaySource,
    lines,
    safeTotal,
    perWeek,
    displayPerWeek,
    perDay,
    displayPerDay: Math.max(0, Math.floor(perDay)),
    perMonth,
    displayPerMonth: Math.max(0, Math.floor(perMonth / 5) * 5),
    shortfall: safeTotal < 0 ? -safeTotal : 0,
    usualWeeklyEveryday,
    status,
    lateSalary,
  };
}

function nextPayday(asOf: string, midMonth: boolean, paidThisMonth: boolean) {
  const month = asOf.slice(0, 7);
  const monthEnd = lastDayOfMonth(month);
  if (!midMonth) return asOf < monthEnd ? monthEnd : lastDayOfMonth(addMonths(month, 1));
  if (day(asOf) < 15) return `${month}-15`;
  // The 15th has passed without a salary: expect it at month end.
  if (!paidThisMonth && asOf < monthEnd) return monthEnd;
  return `${addMonths(month, 1)}-15`;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function day(date: string) {
  return Number(date.slice(8, 10));
}

function toUtc(date: string) {
  const [year, month, dayOfMonth] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, dayOfMonth);
}

function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, '0')}`;
}

function monthsInRange(first: string, last: string) {
  const months: string[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month);
  return months;
}

function monthsBetween(first: string, last: string) {
  return monthsInRange(first, last).length;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatMonth(month: string) {
  return `${monthNames[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

export function formatDate(date: string) {
  return `${day(date)} ${monthNames[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

function formatPlain(value: number) {
  return value.toFixed(2);
}
