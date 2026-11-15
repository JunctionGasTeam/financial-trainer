import { useCallback } from 'react';

import type { LookupOutcome, LookupRunner } from '@/features/chat/api';
import { parseQueryForm } from '@/features/query/form';
import { runQuery } from '@/features/query/run';
import { useBaskets } from '@/hooks/use-baskets';

/** Runs the coach's query forms on the device, with the user's basket moves applied. */
export function useLookups(): LookupRunner {
  const { transactions, asOf, classifier, error } = useBaskets();

  return useCallback(async (forms: unknown[]) => {
    return forms.map((form): LookupOutcome => {
      const parsed = parseQueryForm(form);
      if ('error' in parsed) return { form, error: parsed.error };
      if (!asOf || !classifier) return { form, error: error || 'Your transactions are still loading.' };
      try {
        return { form: parsed.form, result: runQuery(transactions, parsed.form, asOf, classifier.bucketOf) };
      } catch {
        return { form: parsed.form, error: 'The lookup failed.' };
      }
    });
  }, [transactions, asOf, classifier, error]);
}
