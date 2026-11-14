import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { periodLabels, safeAmount } from '@/components/safe-to-spend-card';
import { Bento } from '@/constants/bento';
import { formatDate, type SafeToSpend, type SafeToSpendLine, type SafeToSpendPeriod } from '@/features/safe-to-spend/calc';
import { coachLine, formatEuro, lateSalaryLine } from '@/features/safe-to-spend/format';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { CloseButton } from '@/components/ui/close-button';
import { useWipe, WipeScreen } from '@/components/ui/wipe-screen';

const { ink, tileRadius, gridGap } = Bento;
const sideTileHeight = 104;

const lineIcons: Record<SafeToSpendLine['key'], SymbolViewProps['name']> = {
  balance: { ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  housing: { ios: 'house', android: 'home', web: 'home' },
  utilities: { ios: 'bolt', android: 'bolt', web: 'bolt' },
  groceries: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  buffer: { ios: 'umbrella', android: 'beach_access', web: 'beach_access' },
  savings: { ios: 'banknote', android: 'savings', web: 'savings' },
};
const badgeColors = [Bento.lime, Bento.purple, Bento.pink];

/** "How this was calculated": a dark sheet that slides down from the top, like the chat overlay in reverse. */
export function SafeToSpendDetails() {
  return (
    <WipeScreen color={Bento.surface} from="top">
      <DetailsContent />
    </WipeScreen>
  );
}

function DetailsContent() {
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<SafeToSpendPeriod>(params.period === 'month' ? 'month' : 'day');
  const { result, error } = useSafeToSpend();
  // Keep the first frames light: the heavy body mounts only once the sheet is in place.
  const { close, opened } = useWipe();

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <CloseButton accessibilityLabel="Close calculation" onPress={close} />
          <Text style={styles.title} accessibilityRole="header">How this was calculated</Text>
        </View>

        {opened && result ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content}>
              <PeriodSwitch period={period} onChange={setPeriod} />
              <Hero result={result} period={period} />
              <Breakdown result={result} />
            </ScrollView>
          </Animated.View>
        ) : (
          <View style={styles.centered}>
            {error
              ? <Text style={styles.muted}>{error}</Text>
              : opened && <ActivityIndicator color={Bento.lime} />}
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

function PeriodSwitch({ period, onChange }: { period: SafeToSpendPeriod; onChange: (period: SafeToSpendPeriod) => void }) {
  return (
    <View style={styles.switch} accessibilityRole="radiogroup">
      {(['day', 'month'] as const).map((option) => {
        const selected = option === period;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={[styles.switchOption, selected && { backgroundColor: option === 'day' ? Bento.purple : Bento.pink }]}>
            <Text style={[styles.switchText, selected && styles.switchTextSelected]}>{periodLabels[option].tile}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Hero({ result, period }: { result: SafeToSpend; period: SafeToSpendPeriod }) {
  return (
    <View style={styles.grid}>
      <View style={[styles.tile, styles.mainTile]}>
        <Text style={styles.tileEyebrow}>{periodLabels[period].eyebrow}</Text>
        <View>
          <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatEuro(safeAmount(result, period))}
          </Text>
          <Text style={styles.tileCaption}>
            {period === 'day'
              ? `${formatEuro(result.safeTotal, 2)} ÷ ${result.days} ${result.days === 1 ? 'day' : 'days'}`
              : `${formatEuro(result.perDay, 2)} a day × 30, rounded down to €5`}
          </Text>
        </View>
      </View>
      <View style={styles.sideColumn}>
        <View style={[styles.tile, styles.sideTile, { backgroundColor: Bento.purple }]}>
          <Text style={styles.tileEyebrow}>NEXT PAYDAY</Text>
          <View>
            <Text style={styles.sideValue} numberOfLines={1} adjustsFontSizeToFit>{formatDate(result.payday)}</Text>
            <Text style={styles.tileCaption} numberOfLines={2}>{result.paydaySource}</Text>
          </View>
        </View>
        <View style={[styles.tile, styles.sideTile, { backgroundColor: Bento.pink }]}>
          <Text style={styles.tileEyebrow}>DAYS LEFT</Text>
          <View>
            <Text style={styles.sideValue}>{result.days}</Text>
            <Text style={styles.tileCaption}>until payday</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Breakdown({ result }: { result: SafeToSpend }) {
  const late = lateSalaryLine(result);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">Breakdown</Text>
      {result.lines.map((line, index) => (
        <Row
          key={line.key}
          icon={lineIcons[line.key]}
          badge={badgeColors[index % badgeColors.length]}
          label={line.label}
          value={formatEuro(line.amount, 2)}
          source={line.source}
        />
      ))}

      <Text style={[styles.sectionTitle, styles.sectionGap]} accessibilityRole="header">Result</Text>
      <Row
        icon={{ ios: 'equal', android: 'drag_handle', web: 'drag_handle' }}
        badge={Bento.lime}
        label="Safe until payday"
        value={formatEuro(result.safeTotal, 2)}
        source="Balance minus everything above"
        bold
      />
      <Row
        icon={{ ios: 'sun.max', android: 'today', web: 'today' }}
        badge={Bento.purple}
        label="Per day"
        value={formatEuro(result.perDay, 2)}
        source={`${formatEuro(result.safeTotal, 2)} over ${result.days} ${result.days === 1 ? 'day' : 'days'}, shown rounded down to €1`}
        bold
      />
      <Row
        icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
        badge={Bento.pink}
        label="Per month"
        value={formatEuro(result.perMonth, 2)}
        source="Per day times 30, shown rounded down to €5"
        bold
      />

      <Text style={[styles.sectionTitle, styles.sectionGap]} accessibilityRole="header">What it means</Text>
      {result.status === 'shortfall' && (
        <Note icon={{ ios: 'exclamationmark.octagon', android: 'error', web: 'error' }} tint="#ff8a80">
          Expected shortfall of {formatEuro(result.shortfall, 2)} before payday.
        </Note>
      )}
      <Note icon={{ ios: 'lightbulb', android: 'lightbulb', web: 'lightbulb' }} tint={Bento.lime}>{coachLine(result)}</Note>
      {late && (
        <Note icon={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }} tint={Bento.gold}>{late}</Note>
      )}
    </View>
  );
}

function Row({ icon, badge, label, value, source, bold }: {
  icon: SymbolViewProps['name'];
  badge: string;
  label: string;
  value: string;
  source?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}. ${source ?? ''}`}>
      <View style={[styles.rowBadge, { backgroundColor: badge }]}>
        <SymbolView name={icon} tintColor={ink} size={16} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowLabel, bold && styles.bold]} numberOfLines={2}>{label}</Text>
          <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
        </View>
        {source ? <Text style={styles.rowSource}>{source}</Text> : null}
      </View>
    </View>
  );
}

function Note({ icon, tint, children }: { icon: SymbolViewProps['name']; tint: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <SymbolView name={icon} tintColor={tint} size={20} />
      <Text style={[styles.rowCopy, styles.noteText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    color: Bento.textOnSurface,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  muted: {
    color: Bento.textOnSurfaceMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  switch: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 4,
    gap: 4,
    borderRadius: 999,
    backgroundColor: Bento.surfaceRow,
  },
  switchOption: {
    minWidth: 72,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  switchText: {
    color: Bento.textOnSurfaceMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  switchTextSelected: {
    color: ink,
  },
  grid: {
    flexDirection: 'row',
    gap: gridGap,
  },
  tile: {
    borderRadius: tileRadius,
    padding: 14,
    justifyContent: 'space-between',
  },
  mainTile: {
    flex: 1.15,
    height: sideTileHeight * 2 + gridGap,
    padding: 16,
    backgroundColor: Bento.lime,
  },
  sideColumn: {
    flex: 1,
    gap: gridGap,
  },
  sideTile: {
    height: sideTileHeight,
  },
  tileEyebrow: {
    color: ink,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroAmount: {
    color: ink,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sideValue: {
    color: ink,
    fontSize: 20,
    fontWeight: '700',
  },
  tileCaption: {
    color: ink,
    opacity: 0.75,
    fontSize: 12,
    lineHeight: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: Bento.textOnSurface,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  sectionGap: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: Bento.surfaceRow,
  },
  rowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    color: Bento.textOnSurface,
    fontSize: 14,
    fontWeight: '500',
  },
  rowValue: {
    color: Bento.textOnSurface,
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  bold: {
    fontWeight: '700',
  },
  rowSource: {
    color: Bento.textOnSurfaceMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  noteText: {
    color: Bento.textOnSurface,
    fontSize: 14,
    lineHeight: 20,
  },
  dimmed: {
    opacity: 0.6,
  },
});
