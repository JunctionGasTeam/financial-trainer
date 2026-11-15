/**
 * The one basket classifier every screen uses: the default rules (rules.ts) plus the user's own
 * moves (docs/SPEC.md B2). The most specific move wins: transaction, then merchant type, then category.
 */
import {
  classify,
  isRegularPharmacyBuyer,
  LARGE_PURCHASE_EUR,
  type Basket,
  type Bucket,
  type Transaction,
} from '@/features/baskets/rules';
import { addMonths } from '@/features/safe-to-spend/calc';

export type OverrideLevel = 'transaction' | 'merchant_type' | 'category';

/** `key` is the transaction id, the merchant category code, or the category name. */
export type BasketOverride = { level: OverrideLevel; key: string; basket: Basket };

export type BasketDecision = {
  bucket: Bucket;
  defaultBucket: Bucket;
  /** The level of the user's move that decided the basket, if any. */
  movedBy: OverrideLevel | null;
};

export type Classifier = {
  decide: (tx: Transaction) => BasketDecision;
  bucketOf: (tx: Transaction) => Bucket;
};

const isBasket = (bucket: Bucket): bucket is Basket => bucket !== 'income' && bucket !== 'transfer';

export function createClassifier(transactions: Transaction[], asOf: string, overrides: BasketOverride[]): Classifier {
  const asOfMonth = asOf.slice(0, 7);
  const referenceMonths = Array.from({ length: 6 }, (_, index) => addMonths(asOfMonth, index - 6));
  const context = {
    regularPharmacyBuyer: isRegularPharmacyBuyer(transactions.filter((tx) => tx.date <= asOf), referenceMonths),
  };
  const byLevel: Record<OverrideLevel, Map<string, Basket>> = {
    transaction: new Map(),
    merchant_type: new Map(),
    category: new Map(),
  };
  for (const override of overrides) byLevel[override.level].set(override.key, override.basket);

  const decide = (tx: Transaction): BasketDecision => {
    const defaultBucket = classify(tx, context);
    // Income and transfers are never baskets, so they cannot be moved into one.
    if (!isBasket(defaultBucket)) return { bucket: defaultBucket, defaultBucket, movedBy: null };
    const candidates: [OverrideLevel, string | null][] = [
      ['transaction', tx.id != null ? String(tx.id) : null],
      ['merchant_type', tx.mccCode],
      ['category', tx.category],
    ];
    for (const [level, key] of candidates) {
      const basket = key != null ? byLevel[level].get(key) : undefined;
      // A move that keeps the default basket (e.g. "yes, it was a repair") is a confirmation, not a move.
      if (basket) return { bucket: basket, defaultBucket, movedBy: basket === defaultBucket ? null : level };
    }
    return { bucket: defaultBucket, defaultBucket, movedBy: null };
  };

  return { decide, bucketOf: (tx) => decide(tx).bucket };
}

/**
 * Purchases put in unexpected necessities only because of their size (rules 5 and 9). The rules
 * cannot tell a washing machine from a television, so the coach asks about these (SPEC B3).
 */
export function isSizeBasedOneOff(tx: Transaction, decision: BasketDecision) {
  return decision.defaultBucket === 'irregular' &&
    (tx.category === 'Home & Tech' || tx.category === 'Transportation') &&
    -tx.amount >= LARGE_PURCHASE_EUR;
}
