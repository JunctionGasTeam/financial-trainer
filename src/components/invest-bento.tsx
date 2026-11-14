import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UnrollReveal } from '@/components/unroll-reveal';
import type { InvestAdvice, InvestAllocation, InvestAsset } from '@/features/chat/api';

const ink = '#10201B';
const inkMuted = '#4f615b';
const tileRadius = 24;
const gridGap = 8;
// Fixed heights keep the bento shape without flex-stretching inside the reveal clip.
const smallTileHeight = 150;

const assetStyles: Record<InvestAsset, { label: string; color: string; icon: SymbolViewProps['name'] }> = {
  stocks: {
    label: 'Stocks',
    color: '#d6f24a',
    icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  },
  bonds: {
    label: 'Bonds',
    color: '#b9a6f5',
    icon: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' },
  },
  gold: {
    label: 'Gold',
    color: '#f7d98b',
    icon: { ios: 'medal', android: 'workspace_premium', web: 'workspace_premium' },
  },
};

const formatEur = (amount: number) => `€${Math.round(amount).toLocaleString('en-US')}`;

/** Bento grid: the largest allocation fills the left tile, the other two stack on the right. */
export function InvestBento({ advice }: { advice: InvestAdvice }) {
  const [main, ...rest] = [...advice.allocations].sort((a, b) => b.share - a.share);
  if (!main) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        <UnrollReveal index={0} borderRadius={tileRadius} style={styles.mainSlot}>
          <AssetTile allocation={main} large />
        </UnrollReveal>
        <View style={styles.sideColumn}>
          {rest.map((allocation, index) => (
            <UnrollReveal key={allocation.asset} index={index + 1} borderRadius={tileRadius}>
              <AssetTile allocation={allocation} />
            </UnrollReveal>
          ))}
        </View>
      </View>
      <Text style={styles.caption}>
        {formatEur(advice.total)} / month in total · Demo, not financial advice
      </Text>
    </View>
  );
}

function AssetTile({ allocation, large = false }: { allocation: InvestAllocation; large?: boolean }) {
  const asset = assetStyles[allocation.asset];
  return (
    <View style={[styles.tile, large && styles.largeTile, { backgroundColor: asset.color }]}>
      <View style={styles.tileTop}>
        <View style={styles.iconBadge}>
          <SymbolView name={asset.icon} tintColor={ink} size={16} />
        </View>
        <SymbolView
          name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }}
          tintColor={ink}
          size={16}
        />
      </View>

      <View style={styles.tileBottom}>
        <Text style={[styles.assetName, large && styles.largeAssetName]} numberOfLines={1}>
          {asset.label}
        </Text>
        <Text style={[styles.amount, large && styles.largeAmount]} numberOfLines={1}>
          {formatEur(allocation.amount)} / mo · {allocation.share}%
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Invest in ${asset.label}`}
          onPress={() => {}}
          style={({ pressed }) => [styles.investButton, pressed && styles.dimmed]}>
          <Text style={styles.investText}>Invest</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: gridGap,
  },
  mainSlot: {
    flex: 1.1,
  },
  sideColumn: {
    flex: 1,
    gap: gridGap,
  },
  tile: {
    height: smallTileHeight,
    justifyContent: 'space-between',
    borderRadius: tileRadius,
    padding: 14,
  },
  largeTile: {
    height: smallTileHeight * 2 + gridGap,
    padding: 16,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  tileBottom: {
    alignItems: 'flex-start',
    gap: 4,
  },
  assetName: {
    color: ink,
    fontSize: 16,
    fontWeight: '600',
  },
  largeAssetName: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
  },
  amount: {
    color: ink,
    fontSize: 13,
    opacity: 0.8,
  },
  largeAmount: {
    fontSize: 15,
  },
  investButton: {
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: ink,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  investText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  caption: {
    color: inkMuted,
    fontSize: 12,
  },
  dimmed: {
    opacity: 0.6,
  },
});
