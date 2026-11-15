import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CustomerTransaction } from '@/data/transactions';
import type { BasketDecision, OverrideLevel } from '@/features/baskets/classifier';
import { basketLabels, type Basket } from '@/features/baskets/rules';
import { merchantLabel } from '@/features/query/merchant-types';
import { formatDate } from '@/features/safe-to-spend/calc';
import { formatEuro } from '@/features/safe-to-spend/format';
import { useBaskets } from '@/hooks/use-baskets';

const bankGreen = '#008044';
const ink = '#10201B';
const inkMuted = '#4f615b';
const tint = '#e2f3e8';
const basketOrder: Basket[] = ['regular', 'irregular', 'everyday'];
const shortLabels: Record<Basket, string> = { regular: 'Regular', irregular: 'Unexpected', everyday: 'Everyday' };

export type BasketRow = { tx: CustomerTransaction; decision: BasketDecision };

type Target =
  | { kind: 'transaction'; row: BasketRow }
  | { kind: 'category'; category: string };

type Scope = { level: OverrideLevel; key: string; label: string };

/** Bottom sheet listing one basket's purchases for a month, with moves at every level (SPEC B2). */
export function BasketMoveSheet({
  basket,
  monthLabel,
  rows,
  onClose,
}: {
  basket: Basket | null;
  monthLabel: string;
  rows: BasketRow[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { overrides, move } = useBaskets();
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState('');

  const byCategory = useMemo(() => {
    const groups = new Map<string, BasketRow[]>();
    for (const row of rows) groups.set(row.tx.category, [...(groups.get(row.tx.category) ?? []), row]);
    return [...groups.entries()]
      .map(([category, items]) => ({ category, items, total: items.reduce((sum, item) => sum - item.tx.amount, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const overrideAt = (level: OverrideLevel, key: string) =>
    overrides.find((item) => item.level === level && item.key === key)?.basket ?? null;

  const scopes: Scope[] = !target
    ? []
    : target.kind === 'category'
      ? [{ level: 'category', key: target.category, label: `All ${target.category}` }]
      : [
        { level: 'transaction', key: String(target.row.tx.id), label: 'Just this purchase' },
        ...(target.row.tx.mccCode
          ? [{ level: 'merchant_type' as const, key: target.row.tx.mccCode, label: `All ${merchantLabel(target.row.tx.mccCode, target.row.tx.category).toLowerCase()} purchases` }]
          : []),
        { level: 'category', key: target.row.tx.category, label: `All ${target.row.tx.category}` },
      ];

  function apply(scope: Scope, next: Basket | null) {
    move(scope.level, scope.key, next);
    setNotice(next ? `${scope.label} now count as ${basketLabels[next].toLowerCase()}.` : `${scope.label}: back to the default basket.`);
    setTarget(null);
  }

  function close() {
    setTarget(null);
    setNotice('');
    onClose();
  }

  return (
    <Modal visible={basket != null} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close basket" onPress={close} style={StyleSheet.absoluteFill} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            {target ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Back to the list" onPress={() => setTarget(null)} style={styles.headerButton}>
                <Text style={styles.link}>Back</Text>
              </Pressable>
            ) : null}
            <Text style={styles.title} numberOfLines={2}>
              {target
                ? target.kind === 'category'
                  ? `Move all ${target.category}`
                  : `${merchantLabel(target.row.tx.mccCode, target.row.tx.category)}, ${formatEuro(-target.row.tx.amount, 2)}`
                : basket ? `${basketLabels[basket]} · ${monthLabel}` : ''}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.headerButton}>
              <Text style={styles.link}>Done</Text>
            </Pressable>
          </View>

          {target ? (
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={styles.hint}>
                Pick the basket this belongs in. It changes every figure in the app, for you only.
              </Text>
              {scopes.map((scope) => {
                const current = scope.level === 'transaction' && target.kind === 'transaction'
                  ? target.row.decision.bucket
                  : overrideAt(scope.level, scope.key);
                const moved = overrideAt(scope.level, scope.key) != null;
                return (
                  <View key={scope.level} style={styles.scope}>
                    <Text style={styles.scopeLabel}>{scope.label}</Text>
                    <View style={styles.choices}>
                      {basketOrder.map((choice) => {
                        const selected = current === choice;
                        return (
                          <Pressable
                            key={choice}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`${scope.label}: ${basketLabels[choice]}`}
                            onPress={() => apply(scope, choice)}
                            style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>
                            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{shortLabels[choice]}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {moved && (
                      <Pressable accessibilityRole="button" onPress={() => apply(scope, null)} hitSlop={8}>
                        <Text style={styles.link}>Undo this move</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.body}>
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              {byCategory.length === 0 && <Text style={styles.hint}>Nothing in this basket in {monthLabel}.</Text>}
              {byCategory.map((group) => (
                <View key={group.category} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{group.category}</Text>
                    <Text style={styles.groupTotal}>{formatEuro(group.total, 2)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move all ${group.category} to another basket`}
                    onPress={() => setTarget({ kind: 'category', category: group.category })}
                    hitSlop={8}>
                    <Text style={styles.link}>Move all {group.category}</Text>
                  </Pressable>
                  {group.items.map((row) => (
                    <Pressable
                      key={row.tx.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${merchantLabel(row.tx.mccCode, row.tx.category)} ${formatEuro(-row.tx.amount, 2)} on ${formatDate(row.tx.date)}`}
                      onPress={() => setTarget({ kind: 'transaction', row })}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                      <View style={styles.rowText}>
                        <Text style={styles.merchant}>{merchantLabel(row.tx.mccCode, row.tx.category)}</Text>
                        <Text style={styles.meta}>{formatDate(row.tx.date)}</Text>
                      </View>
                      {row.decision.movedBy && <Text style={styles.badge}>Moved</Text>}
                      <Text style={styles.amount}>{formatEuro(-row.tx.amount, 2)}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16, 32, 27, 0.25)' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#ffffff', paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#dce5e2', marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, minHeight: 48 },
  headerButton: { minHeight: 48, minWidth: 48, justifyContent: 'center' },
  title: { flex: 1, color: ink, fontSize: 17, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  hint: { color: inkMuted, fontSize: 14, lineHeight: 20 },
  notice: { color: ink, fontSize: 14, lineHeight: 20, backgroundColor: tint, borderRadius: 12, padding: 12 },
  link: { color: bankGreen, fontSize: 14, fontWeight: '600' },
  group: { gap: 6 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  groupTitle: { color: ink, fontSize: 15, fontWeight: '600' },
  groupTotal: { color: ink, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  rowText: { flex: 1 },
  merchant: { color: ink, fontSize: 14 },
  meta: { color: inkMuted, fontSize: 12 },
  amount: { color: ink, fontSize: 14, fontVariant: ['tabular-nums'] },
  badge: { color: bankGreen, fontSize: 12, fontWeight: '600', backgroundColor: tint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  scope: { gap: 8 },
  scopeLabel: { color: ink, fontSize: 15, fontWeight: '600' },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: '#dce5e2', alignItems: 'center', justifyContent: 'center' },
  choiceSelected: { backgroundColor: bankGreen, borderColor: bankGreen },
  choiceText: { color: ink, fontSize: 14, fontWeight: '500' },
  choiceTextSelected: { color: '#ffffff' },
  pressed: { opacity: 0.7 },
});
