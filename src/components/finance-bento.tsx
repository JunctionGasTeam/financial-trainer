import { useState, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Rect, Svg } from 'react-native-svg';

import { Bento } from '@/constants/bento';
import type { RecentTransactionData } from '@/data/transactions';
import { useRecentFinanceData } from '@/hooks/use-recent-finance-data';

const { ink, tileRadius, gridGap } = Bento;
const chartHeight = 72;

type MonthPoint = { label: string; spending: number; income: number };

function monthPoints(data: RecentTransactionData, count: number): MonthPoint[] {
  return data.window.availableMonths.slice(-count).map((month) => {
    const [year, m] = month.split('-').map(Number);
    const summary = data.monthlyData[month];
    return {
      label: new Date(year, m - 1, 1).toLocaleString('en-US', { month: 'short' }),
      spending: summary?.spending.total ?? 0,
      income: summary?.income.total ?? 0,
    };
  });
}

function useWidth() {
  const [width, setWidth] = useState(0);
  return [width, (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)] as const;
}

/** Spending / anomaly / savings tiles: one wide tile on top, two half tiles below. */
export function FinanceBento() {
  const { data, error } = useRecentFinanceData();
  const six = data ? monthPoints(data, 6) : null;

  return (
    <View style={styles.grid}>
      <Tile
        title="Spending & income"
        label="Open spending and income overview"
        href="/spending-report"
        background={Bento.purple}
        text={ink}
        style={styles.wideTile}
        error={error}>
        {six && (
          <>
            <BarPairs points={six} />
            <Legend items={[{ label: 'Income', color: '#ffffff' }, { label: 'Spending', color: ink }]} text={ink} />
          </>
        )}
      </Tile>

      <View style={styles.row}>
        <LinkTile
          title="Anomaly detection"
          description="Review unusual monthly patterns"
          label="Open anomaly detection"
          href="/anomaly-detection"
          icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          background={Bento.surface}
          text={Bento.textOnSurface}
          muted={Bento.textOnSurfaceMuted}
          dark
        />

        <LinkTile
          title="Savings goal"
          description="Build a plan from your spending habits"
          label="Open savings goal planner"
          href="/savings-goal"
          icon={{ ios: 'target', android: 'track_changes', web: 'track_changes' }}
          background={Bento.lime}
          text={ink}
          muted={ink}
        />
      </View>
    </View>
  );
}

function Tile({ title, label, href, background, text, style, error, children }: {
  title: string;
  label: string;
  href: string;
  background: string;
  text: string;
  style: object | object[];
  error: string;
  children: ReactNode;
}) {
  const loading = !children && !error;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href as Href)}
      style={({ pressed }) => [styles.tile, { backgroundColor: background }, style, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]} numberOfLines={2}>{title}</Text>
        <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} tintColor={text} size={16} />
      </View>
      <View style={styles.body}>
        {error ? <Text style={[styles.error, { color: text }]}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={text} /> : children}
      </View>
    </Pressable>
  );
}

/** Half tile with the icon, title and description of a finance screen. */
function LinkTile({ title, description, label, href, icon, background, text, muted, dark = false }: {
  title: string;
  description: string;
  label: string;
  href: string;
  icon: SymbolViewProps['name'];
  background: string;
  text: string;
  muted: string;
  dark?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href as Href)}
      style={({ pressed }) => [
        styles.tile,
        styles.halfTile,
        dark && styles.darkTile,
        { backgroundColor: background },
        pressed && styles.pressed,
      ]}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <SymbolView name={icon} tintColor={Bento.bankGreen} size={26} />
        </View>
        <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} tintColor={text} size={16} />
      </View>
      <View style={styles.linkCopy}>
        <Text style={[styles.title, { color: text }]}>{title}</Text>
        <Text style={[styles.description, { color: muted }, !dark && styles.inkMuted]}>{description}</Text>
      </View>
    </Pressable>
  );
}

function MonthLabels({ points, color }: { points: MonthPoint[]; color: string }) {
  return (
    <View style={styles.labels}>
      {points.map((point, index) => (
        <Text key={`${point.label}-${index}`} style={[styles.monthLabel, { color }]} numberOfLines={1}>
          {point.label}
        </Text>
      ))}
    </View>
  );
}

function Legend({ items, text }: { items: { label: string; color: string }[]; text: string }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
          <Text style={[styles.legendText, { color: text }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Pairs of rounded bars per month, sharing one scale from zero. */
function BarPairs({ points }: { points: MonthPoint[] }) {
  const [width, onLayout] = useWidth();
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.spending]));
  const slot = points.length ? width / points.length : 0;
  const bar = 8;
  const gap = 4;
  const barHeight = (value: number) => Math.max(bar, (value / max) * chartHeight);

  return (
    <View>
      <View onLayout={onLayout} style={styles.chart}>
        {width > 0 && (
          <Svg width={width} height={chartHeight}>
            {points.map((point, index) => {
              const center = slot * index + slot / 2;
              const income = barHeight(point.income);
              const spending = barHeight(point.spending);
              return [
                <Rect key={`i${index}`} x={center - bar - gap / 2} y={chartHeight - income} width={bar} height={income} rx={bar / 2} fill="#ffffff" />,
                <Rect key={`s${index}`} x={center + gap / 2} y={chartHeight - spending} width={bar} height={spending} rx={bar / 2} fill={ink} />,
              ];
            })}
          </Svg>
        )}
      </View>
      <MonthLabels points={points} color={ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: gridGap,
  },
  row: {
    flexDirection: 'row',
    gap: gridGap,
  },
  tile: {
    borderRadius: tileRadius,
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  wideTile: {
    minHeight: 200,
  },
  halfTile: {
    flex: 1,
    minHeight: 190,
  },
  darkTile: {
    borderWidth: 1,
    borderColor: Bento.surfaceRow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: 10,
  },
  iconBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#ffffff',
  },
  linkCopy: {
    gap: 4,
  },
  description: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inkMuted: {
    opacity: 0.8,
  },
  chart: {
    height: chartHeight,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
  error: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
