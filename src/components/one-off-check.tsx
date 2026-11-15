import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Bento } from '@/constants/bento';
import { isSizeBasedOneOff } from '@/features/baskets/classifier';
import { merchantLabel } from '@/features/query/merchant-types';
import { addMonths, formatDate } from '@/features/safe-to-spend/calc';
import { formatEuro } from '@/features/safe-to-spend/format';
import { useBaskets } from '@/hooks/use-baskets';

const { ink, inkMuted, bankGreen, mint } = Bento;

/**
 * The coach asks once about a large purchase the rules put in unexpected necessities only
 * because of its size (SPEC B3). The answer is stored as a move of that one transaction.
 */
export function OneOffCheck() {
  const { transactions, classifier, asOf, overrides, move } = useBaskets();
  const [answer, setAnswer] = useState('');

  const pending = useMemo(() => {
    if (!classifier || !asOf) return null;
    const since = `${addMonths(asOf.slice(0, 7), -11)}-01`;
    const answered = new Set(overrides.filter((item) => item.level === 'transaction').map((item) => item.key));
    for (let index = transactions.length - 1; index >= 0; index -= 1) {
      const tx = transactions[index];
      if (tx.date > asOf || tx.amount >= 0) continue;
      if (tx.date < since) break;
      const decision = classifier.decide(tx);
      if (!decision.movedBy && !answered.has(String(tx.id)) && isSizeBasedOneOff(tx, decision)) return tx;
    }
    return null;
  }, [transactions, classifier, asOf, overrides]);

  if (!pending) {
    return answer ? (
      <View style={styles.card}>
        <Text style={styles.body}>{answer}</Text>
      </View>
    ) : null;
  }

  const where = merchantLabel(pending.mccCode, pending.category);
  const amount = formatEuro(-pending.amount, 2);

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.eyebrow}>QUICK QUESTION</Text>
      <Text style={styles.body}>
        {where} purchase of {amount} on {formatDate(pending.date)}. Was this something you had to replace or repair?
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Yes, the ${amount} purchase was a necessity`}
          onPress={() => {
            move('transaction', String(pending.id), 'irregular');
            setAnswer(`Thanks. ${amount} stays in unexpected necessities.`);
          }}
          style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>Yes, I had to</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`No, the ${amount} purchase was a choice`}
          onPress={() => {
            move('transaction', String(pending.id), 'everyday');
            setAnswer(`Got it. ${amount} now counts as everyday spending, and your figures are updated.`);
          }}
          style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>No, it was a choice</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, backgroundColor: mint, padding: 16, gap: 10 },
  eyebrow: { color: inkMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  body: { color: ink, fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  button: { minHeight: 48, borderRadius: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: bankGreen },
  primaryText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: bankGreen, backgroundColor: '#ffffff' },
  secondaryText: { color: bankGreen, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
