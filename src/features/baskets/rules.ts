/**
 * Basket rules from docs/SPEC.md section 5. Plain code, no model call, so every
 * figure built on top of them is reproducible.
 */

export type Basket = 'regular' | 'irregular' | 'everyday';
export type Bucket = Basket | 'income' | 'transfer';

export type Transaction = {
  date: string; // YYYY-MM-DD
  category: string;
  amount: number; // signed EUR, negative = money out
  balanceAfter: number;
  mccCode: string | null;
};

export const LARGE_PURCHASE_EUR = 300;

export const basketLabels: Record<Basket, string> = {
  regular: 'Regular essentials',
  irregular: 'Unexpected necessities',
  everyday: 'Everyday spending',
};

const PHARMACY_MCC = '5912';
const EVERYDAY_TRANSPORT_MCC = new Set(['4121', '7523']); // taxi, parking

export type BasketContext = {
  /** Rule 7: pharmacy purchases in at least 4 of the 6 reference months. */
  regularPharmacyBuyer: boolean;
};

export function classify(tx: Transaction, context: BasketContext): Bucket {
  const { category, mccCode } = tx;
  const amount = Math.abs(tx.amount);
  if (category === 'Salary' || category === 'Other Income') return 'income';
  if (category === 'Invest Deposit' || category === 'Invest Withdraw' || category === 'Salary Sweep') return 'transfer';
  if (category === 'Housing' || category === 'Utilities' || category === 'Groceries') return 'regular';
  if (category === 'Transportation') {
    if (mccCode && EVERYDAY_TRANSPORT_MCC.has(mccCode)) return 'everyday';
    if (amount >= LARGE_PURCHASE_EUR) return 'irregular';
    return 'regular';
  }
  if (mccCode === PHARMACY_MCC && context.regularPharmacyBuyer) return 'regular';
  if (category === 'Health') return 'irregular';
  if (category === 'Home & Tech' && amount >= LARGE_PURCHASE_EUR) return 'irregular';
  return 'everyday';
}

export function isRegularPharmacyBuyer(transactions: Transaction[], referenceMonths: string[]) {
  if (referenceMonths.length < 6) return false;
  const months = new Set(
    transactions
      .filter((tx) => tx.mccCode === PHARMACY_MCC && tx.amount < 0)
      .map((tx) => tx.date.slice(0, 7))
      .filter((month) => referenceMonths.includes(month)),
  );
  return months.size >= 4;
}
