import Constants from 'expo-constants';

import type { SpendingCategoryHistory, SpendingTransactionForClassification } from '@/data/transactions';

export type SpendingType = 'mandatory_regular' | 'mandatory_irregular' | 'everyday_flexible';
export type TransactionSpendingClassification = { transactionId: number; spendingType: SpendingType };

const configuredApiUrl = process.env.EXPO_PUBLIC_GEMINI_API_URL?.trim();
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (configuredApiUrl || (expoDevHost ? `http://${expoDevHost}:8787` : 'http://localhost:8787')).replace(/\/$/, '');

export async function classifySpendingTransactions(
  transactions: SpendingTransactionForClassification[],
  categoryHistory: SpendingCategoryHistory[],
): Promise<TransactionSpendingClassification[]> {
  const response = await fetch(`${apiUrl}/api/classify-spending`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions, categoryHistory }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Spending classification returned HTTP ${response.status}.`);
  const expectedIds = new Set(transactions.map((transaction) => transaction.transactionId));
  const returnedIds = new Set<number>();
  if (!Array.isArray(result.classifications) || result.classifications.length !== transactions.length) {
    throw new Error('Gemini returned an incomplete transaction classification.');
  }
  for (const item of result.classifications as unknown[]) {
    if (!isClassification(item) || !expectedIds.has(item.transactionId) || returnedIds.has(item.transactionId)) {
      throw new Error('Gemini returned an invalid transaction classification.');
    }
    returnedIds.add(item.transactionId);
  }
  if (returnedIds.size !== expectedIds.size) throw new Error('Gemini did not classify every transaction.');
  return result.classifications as TransactionSpendingClassification[];
}

function isClassification(value: unknown): value is TransactionSpendingClassification {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.transactionId) &&
    ['mandatory_regular', 'mandatory_irregular', 'everyday_flexible'].includes(String(item.spendingType));
}
