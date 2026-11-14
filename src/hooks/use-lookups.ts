import { useCallback, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { CUSTOMER_ID, getAsOfDate, getCustomerTransactions, type CustomerTransaction } from '@/data/transactions';
import type { LookupOutcome, LookupRunner } from '@/features/chat/api';
import { parseQueryForm } from '@/features/query/form';
import { runQuery } from '@/features/query/run';

/** Runs the coach's query forms on the device. Transactions are loaded once, on the first lookup. */
export function useLookups(customerId = CUSTOMER_ID): LookupRunner {
  const db = useSQLiteContext();
  const cache = useRef<Promise<{ asOf: string | null; transactions: CustomerTransaction[] }> | null>(null);

  return useCallback(async (forms: unknown[]) => {
    cache.current ??= Promise.all([getAsOfDate(db), getCustomerTransactions(db, customerId)])
      .then(([asOf, transactions]) => ({ asOf, transactions }));
    let loaded;
    try {
      loaded = await cache.current;
    } catch (caught) {
      cache.current = null;
      throw caught;
    }
    const { asOf, transactions } = loaded;
    return forms.map((form): LookupOutcome => {
      const parsed = parseQueryForm(form);
      if ('error' in parsed) return { form, error: parsed.error };
      if (!asOf) return { form, error: 'There are no transactions to look in.' };
      try {
        return { form: parsed.form, result: runQuery(transactions, parsed.form, asOf) };
      } catch {
        return { form: parsed.form, error: 'The lookup failed.' };
      }
    });
  }, [db, customerId]);
}
