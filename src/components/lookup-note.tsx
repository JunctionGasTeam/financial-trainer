import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { basketLabels, type Basket } from '@/features/baskets/rules';
import type { QueryResult } from '@/features/query/run';
import { formatDate } from '@/features/safe-to-spend/calc';
import { formatEuro } from '@/features/safe-to-spend/format';

const bankGreen = '#008044';
const ink = '#10201B';
const inkMuted = '#4f615b';

/** "Calculated from …" under a coach answer, opening the transactions the figure came from. */
export function LookupNote({ lookups }: { lookups: QueryResult[] }) {
  const [open, setOpen] = useState(false);
  const rows = lookups.flatMap((lookup) => lookup.transactions);
  const omitted = lookups.reduce((sum, lookup) => sum + lookup.transactionsOmitted, 0);
  const periods = [...new Set(lookups.map((lookup) => lookup.period.label))].join(', ');
  const counted = lookups.reduce((sum, lookup) => sum + lookup.count, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>
        Calculated from {counted} transaction{counted === 1 ? '' : 's'} · {periods}
      </Text>
      {rows.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          hitSlop={8}>
          <Text style={styles.toggle}>{open ? 'Hide transactions' : 'Show transactions'}</Text>
        </Pressable>
      )}
      {open && (
        <View style={styles.list}>
          {rows.map((row, index) => (
            <View key={`${row.date}-${index}`} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.merchant}>{row.merchant}</Text>
                <Text style={styles.meta}>
                  {formatDate(row.date)} · {row.basket in basketLabels ? basketLabels[row.basket as Basket] : row.category}
                </Text>
              </View>
              <Text style={styles.amount}>{formatEuro(row.amount, 2)}</Text>
            </View>
          ))}
          {omitted > 0 && <Text style={styles.meta}>and {omitted} more</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    minWidth: '60%',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  caption: {
    color: inkMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  toggle: {
    color: bankGreen,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  merchant: {
    color: ink,
    fontSize: 14,
  },
  meta: {
    color: inkMuted,
    fontSize: 12,
  },
  amount: {
    color: ink,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
