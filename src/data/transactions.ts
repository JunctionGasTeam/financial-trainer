import type { SQLiteDatabase } from 'expo-sqlite';

export const CUSTOMER_ID = 'CUST00001';

export type MonthlyCategory = { category: string; amount: number; color: string };
export type MonthlyFlow = { total: number; categories: MonthlyCategory[] };
export type MonthlyTransactionSummary = { spending: MonthlyFlow; income: MonthlyFlow };
export type AnalysisWindow = {
  startMonth: string;
  endMonth: string;
  requestedMonths: string[];
  availableMonths: string[];
  missingMonths: string[];
};
export type RecentTransactionData = {
  window: AnalysisWindow;
  monthlyData: Record<string, MonthlyTransactionSummary>;
};
export type TransactionMonthRange = { firstMonth: string; lastMonth: string };
export type SalaryIncomeEstimate = { averageMonthlyIncome: number; monthsWithSalary: number };
export type SpendingTransactionForClassification = {
  transactionId: number;
  date: string;
  category: string;
  transactionType: string;
  mccCode: string | null;
  amount: number;
  priorTransactionsAtMerchant: number;
};
export type SpendingCategoryHistory = {
  category: string;
  transactionCount: number;
  monthsActive: number;
  totalAmount: number;
};

type AggregateRow = {
  month: string;
  category: string;
  flow: 'spending' | 'income';
  amount: number;
};

export async function verifyTransactionsDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ transactionCount: number }>(
    'SELECT COUNT(*) AS transactionCount FROM transactions WHERE customer_id = ?',
    CUSTOMER_ID,
  );
  if (!result?.transactionCount) {
    throw new Error(`No SQLite transactions found for ${CUSTOMER_ID}.`);
  }
}

const categoryColors: Record<string, string> = {
  Entertainment: '#d17655',
  Groceries: '#008044',
  Health: '#76b58e',
  'Home & Tech': '#a1aaa7',
  Housing: '#3b9b67',
  'Invest Deposit': '#91a84c',
  Lifestyle: '#d5a338',
  Restaurants: '#6da8a4',
  Salary: '#008044',
  Transportation: '#8d6da8',
  Travel: '#5c8db0',
  Utilities: '#b45d69',
};

const fallbackColors = ['#5c8db0', '#8d6da8', '#6da8a4', '#d17655', '#91a84c', '#a1aaa7'];

function colorForCategory(category: string) {
  if (categoryColors[category]) return categoryColors[category];
  const hash = [...category].reduce((value, character) => value + character.charCodeAt(0), 0);
  return fallbackColors[hash % fallbackColors.length];
}

export async function getTransactionMonthRange(
  db: SQLiteDatabase,
  customerId = CUSTOMER_ID,
): Promise<TransactionMonthRange | null> {
  const result = await db.getFirstAsync<{ firstMonth: string | null; lastMonth: string | null }>(
    `SELECT MIN(substr(tx_date, 1, 7)) AS firstMonth,
            MAX(substr(tx_date, 1, 7)) AS lastMonth
     FROM transactions
     WHERE customer_id = ? AND tx_amount_eur != 0`,
    customerId,
  );

  if (!result?.firstMonth || !result.lastMonth) return null;
  return { firstMonth: result.firstMonth, lastMonth: result.lastMonth };
}

export async function getMonthlyTransactionSummary(
  db: SQLiteDatabase,
  month: string,
  customerId = CUSTOMER_ID,
): Promise<MonthlyTransactionSummary> {
  const monthlyData = await getTransactionSummariesBetween(db, month, month, customerId);
  return monthlyData[month] ?? emptyMonthlySummary();
}

export async function getSpendingClassificationData(
  db: SQLiteDatabase,
  month: string,
  customerId = CUSTOMER_ID,
): Promise<{ transactions: SpendingTransactionForClassification[]; categoryHistory: SpendingCategoryHistory[] }> {
  const [year, monthNumber] = month.split('-').map(Number);
  const historyStart = new Date(year, monthNumber - 12, 1);
  const historyStartMonth = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, '0')}`;
  const nextMonth = nextMonthKey(month);
  const transactions = await db.getAllAsync<SpendingTransactionForClassification>(
    `SELECT current.rowid AS transactionId,
            current.tx_date AS date,
            current.category,
            current.transaction_type AS transactionType,
            current.mcc_code AS mccCode,
            ROUND(ABS(current.tx_amount_eur), 2) AS amount,
            (SELECT COUNT(*) FROM transactions AS previous
             WHERE previous.customer_id = current.customer_id
               AND previous.merchant_id = current.merchant_id
               AND previous.tx_date >= ?
               AND previous.tx_date < current.tx_date
               AND previous.tx_amount_eur < 0) AS priorTransactionsAtMerchant
     FROM transactions AS current
     WHERE current.customer_id = ?
       AND current.tx_date >= ?
       AND current.tx_date < ?
       AND current.tx_amount_eur < 0
     ORDER BY current.tx_timestamp`,
    `${historyStartMonth}-01`,
    customerId,
    `${month}-01`,
    `${nextMonth}-01`,
  );
  const categoryHistory = await db.getAllAsync<SpendingCategoryHistory>(
    `SELECT category,
            COUNT(*) AS transactionCount,
            COUNT(DISTINCT substr(tx_date, 1, 7)) AS monthsActive,
            ROUND(SUM(ABS(tx_amount_eur)), 2) AS totalAmount
     FROM transactions
     WHERE customer_id = ?
       AND tx_date >= ?
       AND tx_date < ?
       AND tx_amount_eur < 0
     GROUP BY category
     ORDER BY totalAmount DESC`,
    customerId,
    `${historyStartMonth}-01`,
    `${nextMonth}-01`,
  );
  return { transactions, categoryHistory };
}

export async function getRecentTransactionData(
  db: SQLiteDatabase,
  now = new Date(),
  customerId = CUSTOMER_ID,
): Promise<RecentTransactionData> {
  const requestedMonths = getLastTwelveMonthKeys(now);
  const startMonth = requestedMonths[0];
  const endMonth = requestedMonths[requestedMonths.length - 1];
  const monthlyData = await getTransactionSummariesBetween(db, startMonth, endMonth, customerId);
  const availableMonths = Object.keys(monthlyData).sort();
  const missingMonths = requestedMonths.filter((month) => !availableMonths.includes(month));

  return {
    window: { startMonth, endMonth, requestedMonths, availableMonths, missingMonths },
    monthlyData,
  };
}

export async function getRecentSalaryIncomeEstimate(
  db: SQLiteDatabase,
  now = new Date(),
  customerId = CUSTOMER_ID,
): Promise<SalaryIncomeEstimate | null> {
  const months = getLastTwelveMonthKeys(now);
  const rows = await db.getAllAsync<{ month: string; income: number }>(
    `SELECT substr(tx_date, 1, 7) AS month, ROUND(SUM(tx_amount_eur), 2) AS income
     FROM transactions
     WHERE customer_id = ?
       AND tx_date >= ?
       AND tx_date < ?
       AND tx_amount_eur > 0
       AND (category = 'Salary' OR lower(transaction_type) = 'salary')
     GROUP BY substr(tx_date, 1, 7)
     ORDER BY month`,
    customerId,
    `${months[0]}-01`,
    `${nextMonthKey(months[months.length - 1])}-01`,
  );
  if (rows.length === 0) return null;
  const averageMonthlyIncome = rows.reduce((total, row) => total + row.income, 0) / rows.length;
  return {
    averageMonthlyIncome: Math.round(averageMonthlyIncome),
    monthsWithSalary: rows.length,
  };
}

export function getLastTwelveMonthKeys(now = new Date()) {
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11, 1);
  return Array.from({ length: 12 }, (_, index) => {
    const month = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  });
}

async function getTransactionSummariesBetween(
  db: SQLiteDatabase,
  startMonth: string,
  endMonth: string,
  customerId: string,
): Promise<Record<string, MonthlyTransactionSummary>> {
  const nextMonth = nextMonthKey(endMonth);
  const rows = await db.getAllAsync<AggregateRow>(
    `SELECT substr(tx_date, 1, 7) AS month,
            category,
            CASE WHEN tx_amount_eur < 0 THEN 'spending' ELSE 'income' END AS flow,
            ROUND(SUM(ABS(tx_amount_eur)), 2) AS amount
     FROM transactions
     WHERE customer_id = ?
       AND tx_date >= ?
       AND tx_date < ?
       AND tx_amount_eur != 0
     GROUP BY substr(tx_date, 1, 7), category, flow
     ORDER BY month DESC, amount DESC`,
    customerId,
    `${startMonth}-01`,
    `${nextMonth}-01`,
  );

  const summaries: Record<string, MonthlyTransactionSummary> = {};
  for (const row of rows) {
    const summary = summaries[row.month] ?? (summaries[row.month] = emptyMonthlySummary());
    const category = { category: row.category, amount: row.amount, color: colorForCategory(row.category) };
    summary[row.flow].categories.push(category);
    summary[row.flow].total = roundMoney(summary[row.flow].total + row.amount);
  }

  return summaries;
}

function emptyMonthlySummary(): MonthlyTransactionSummary {
  return {
    spending: { total: 0, categories: [] },
    income: { total: 0, categories: [] },
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function nextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const nextMonth = new Date(year, month, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
}

export type CustomerTransaction = {
  date: string;
  category: string;
  amount: number;
  balanceAfter: number;
  mccCode: string | null;
};

/** All of one customer's transactions in chronological (file) order. */
export async function getCustomerTransactions(
  db: SQLiteDatabase,
  customerId = CUSTOMER_ID,
): Promise<CustomerTransaction[]> {
  return db.getAllAsync<CustomerTransaction>(
    `SELECT tx_date AS date,
            category,
            tx_amount_eur AS amount,
            balance_after_eur AS balanceAfter,
            mcc_code AS mccCode
     FROM transactions
     WHERE customer_id = ?
     ORDER BY tx_date, rowid`,
    customerId,
  );
}

/** The date the app treats as today: the last date in the dataset (SPEC.md 6.1). */
export async function getAsOfDate(db: SQLiteDatabase): Promise<string | null> {
  const result = await db.getFirstAsync<{ asOf: string | null }>('SELECT MAX(tx_date) AS asOf FROM transactions');
  return result?.asOf ?? null;
}
