import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getAsOfDate,
  getRecentTransactionData,
  getTransactionMonthRange,
  type RecentTransactionData,
} from '@/data/transactions';

/** Loads the 12 months ending at the latest month that has transactions. */
export function useRecentFinanceData() {
  const db = useSQLiteContext();
  const [data, setData] = useState<RecentTransactionData | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const range = await getTransactionMonthRange(db);
      if (!range) throw new Error('No transactions are available for this customer.');
      const [year, month] = range.lastMonth.split('-').map(Number);
      const [recent, lastDate] = await Promise.all([
        getRecentTransactionData(db, new Date(year, month - 1, 1)),
        getAsOfDate(db),
      ]);
      if (active) {
        setAsOf(lastDate);
        setData(recent);
      }
    })().catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Could not load transactions.');
    });
    return () => { active = false; };
  }, [db]);

  return { data, asOf, error };
}
