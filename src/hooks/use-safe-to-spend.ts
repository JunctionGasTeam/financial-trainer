import { useMemo } from 'react';

import { computeSafeToSpend } from '@/features/safe-to-spend/calc';
import { useBaskets } from '@/hooks/use-baskets';

/** Safe-to-spend for the current customer, recomputed when they move something between baskets. */
export function useSafeToSpend() {
  const { transactions, asOf, classifier, error: loadError } = useBaskets();
  return useMemo(() => {
    if (loadError) return { result: null, error: loadError };
    if (!asOf || !classifier) return { result: null, error: '' };
    const result = computeSafeToSpend(transactions, asOf, { bucketOf: classifier.bucketOf });
    return { result, error: result ? '' : 'No transactions are available for this customer.' };
  }, [transactions, asOf, classifier, loadError]);
}
