import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { CUSTOMER_ID, getAsOfDate, getCustomerTransactions } from '@/data/transactions';
import { computeSafeToSpend, type SafeToSpend } from '@/features/safe-to-spend/calc';

export function useSafeToSpend(customerId = CUSTOMER_ID) {
  const db = useSQLiteContext();
  const [result, setResult] = useState<SafeToSpend | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [asOf, transactions] = await Promise.all([getAsOfDate(db), getCustomerTransactions(db, customerId)]);
      const computed = asOf ? computeSafeToSpend(transactions, asOf) : null;
      if (!computed) throw new Error('No transactions are available for this customer.');
      if (active) setResult(computed);
    })().catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Could not work out safe to spend.');
    });
    return () => { active = false; };
  }, [db, customerId]);

  return { result, error };
}
