import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import { CUSTOMER_ID, getAsOfDate, getCustomerTransactions, type CustomerTransaction } from '@/data/transactions';
import { createClassifier, type BasketOverride, type Classifier, type OverrideLevel } from '@/features/baskets/classifier';
import type { Basket } from '@/features/baskets/rules';

type BasketsState = {
  customerId: string;
  /** The date the app treats as today (last date in the data). */
  asOf: string | null;
  transactions: CustomerTransaction[];
  overrides: BasketOverride[];
  classifier: Classifier | null;
  error: string;
  /** Moves an item to a basket; `null` removes the move so the default rule applies again. */
  move: (level: OverrideLevel, key: string, basket: Basket | null) => void;
  reset: () => void;
};

const BasketsContext = createContext<BasketsState | null>(null);

// Moves live in the kv-store, not in customer-transactions.db, which is overwritten from the asset on every launch.
const storageKey = (customerId: string) => `basket-overrides:${customerId}`;

function parseOverrides(raw: string | null): BasketOverride[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is BasketOverride =>
        item && ['transaction', 'merchant_type', 'category'].includes(item.level) && typeof item.key === 'string' &&
        ['regular', 'irregular', 'everyday'].includes(item.basket))
      : [];
  } catch {
    return [];
  }
}

/** Loads one customer's transactions once and shares them, with their basket moves, across screens. */
export function BasketsProvider({ customerId = CUSTOMER_ID, children }: { customerId?: string; children: ReactNode }) {
  const db = useSQLiteContext();
  const [asOf, setAsOf] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [overrides, setOverrides] = useState<BasketOverride[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getAsOfDate(db), getCustomerTransactions(db, customerId), Storage.getItem(storageKey(customerId))])
      .then(([lastDate, rows, stored]) => {
        if (!active) return;
        if (!lastDate || rows.length === 0) throw new Error('No transactions are available for this customer.');
        setAsOf(lastDate);
        setTransactions(rows);
        setOverrides(parseOverrides(stored));
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load transactions.');
      });
    return () => { active = false; };
  }, [db, customerId]);

  const save = useCallback((next: BasketOverride[]) => {
    Storage.setItem(storageKey(customerId), JSON.stringify(next)).catch((caught) => {
      console.warn('Could not save basket moves.', caught);
    });
  }, [customerId]);

  const move = useCallback((level: OverrideLevel, key: string, basket: Basket | null) => {
    setOverrides((current) => {
      const next = (current ?? []).filter((item) => !(item.level === level && item.key === key));
      if (basket) next.push({ level, key, basket });
      save(next);
      return next;
    });
  }, [save]);

  const reset = useCallback(() => {
    setOverrides([]);
    save([]);
  }, [save]);

  const classifier = useMemo(
    () => (asOf && overrides ? createClassifier(transactions, asOf, overrides) : null),
    [transactions, asOf, overrides],
  );

  const value = useMemo<BasketsState>(() => ({
    customerId,
    asOf,
    transactions,
    overrides: overrides ?? [],
    classifier,
    error,
    move,
    reset,
  }), [customerId, asOf, transactions, overrides, classifier, error, move, reset]);

  return <BasketsContext.Provider value={value}>{children}</BasketsContext.Provider>;
}

export function useBaskets() {
  const value = useContext(BasketsContext);
  if (!value) throw new Error('useBaskets must be used inside BasketsProvider.');
  return value;
}
