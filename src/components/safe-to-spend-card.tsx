import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Bento } from '@/constants/bento';
import type { SafeToSpend, SafeToSpendPeriod } from '@/features/safe-to-spend/calc';
import { formatEuro } from '@/features/safe-to-spend/format';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';

const { ink, inkMuted, tileRadius } = Bento;
const cardHeight = 192;
/** How far the back card peeks out below the front one. */
const peek = 10;
const shuffleDuration = 520;

export const periodLabels: Record<SafeToSpendPeriod, { tile: string; eyebrow: string; unit: string }> = {
  day: { tile: 'Day', eyebrow: 'SAFE TO SPEND TODAY', unit: 'per day' },
  month: { tile: 'Month', eyebrow: 'SAFE TO SPEND THIS MONTH', unit: 'per month' },
};

export function safeAmount(result: SafeToSpend, period: SafeToSpendPeriod) {
  return period === 'day' ? result.displayPerDay : result.displayPerMonth;
}

type CardPalette = { background: string; text: string; toggleBackground: string; toggleText: string; warning: string };

const cardPalettes: Record<SafeToSpendPeriod, CardPalette> = {
  day: { background: Bento.mint, text: ink, toggleBackground: Bento.bankGreen, toggleText: '#ffffff', warning: Bento.warning },
  month: { background: Bento.bankGreen, text: '#ffffff', toggleBackground: '#ffffff', toggleText: Bento.bankGreen, warning: '#ffd3cc' },
};
const otherPeriod = (period: SafeToSpendPeriod): SafeToSpendPeriod => (period === 'day' ? 'month' : 'day');

/** Home card: full-width stack of Day / Month cards that shuffle when the top-right toggle is tapped. */
export function SafeToSpendCard({ customerId }: { customerId?: string }) {
  const { result, error } = useSafeToSpend(customerId);
  const [period, setPeriod] = useState<SafeToSpendPeriod>('day');
  const reduceMotion = useReducedMotion();
  // 0 = day card in front, 1 = month card in front.
  const progress = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(period === 'day' ? 0 : 1, {
      duration: reduceMotion ? 0 : shuffleDuration,
      easing: Easing.inOut(Easing.cubic),
    }));
  }, [period, progress, reduceMotion]);

  const onLayout = (event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width);
  const toggle = () => setPeriod(otherPeriod);

  if (!result) {
    return (
      <View style={[styles.card, styles.placeholder, { backgroundColor: cardPalettes.day.background }]}>
        <Text style={styles.eyebrow}>{periodLabels.day.eyebrow}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={ink} style={styles.loader} />}
        <View />
      </View>
    );
  }

  return (
    <View style={styles.stack} onLayout={onLayout}>
      {(['day', 'month'] as const).map((cardPeriod) => (
        <PeriodCard
          key={cardPeriod}
          period={cardPeriod}
          result={result}
          front={cardPeriod === period}
          progress={progress}
          width={width}
          onToggle={toggle}
        />
      ))}
    </View>
  );
}

function PeriodCard({ period, result, front, progress, width, onToggle }: {
  period: SafeToSpendPeriod;
  result: SafeToSpend;
  front: boolean;
  progress: SharedValue<number>;
  width: SharedValue<number>;
  onToggle: () => void;
}) {
  // Outgoing and incoming cards swing to opposite sides while they pass each other.
  const direction = period === 'day' ? 1 : -1;

  const animatedStyle = useAnimatedStyle(() => {
    // 0 when this card is in front, 1 when it rests behind.
    const back = period === 'day' ? progress.get() : 1 - progress.get();
    const swing = Math.sin(Math.PI * back);
    return {
      zIndex: back < 0.5 ? 2 : 1,
      transform: [
        { translateX: swing * width.get() * 0.4 * direction },
        { translateY: interpolate(back, [0, 1], [0, peek]) },
        { rotate: `${swing * 6 * direction}deg` },
        { scale: interpolate(back, [0, 1], [1, 0.94]) },
      ],
    };
  });

  const amount = formatEuro(safeAmount(result, period));
  const palette = cardPalettes[period];

  return (
    <Animated.View
      pointerEvents={front ? 'auto' : 'none'}
      accessibilityElementsHidden={!front}
      importantForAccessibility={front ? 'auto' : 'no-hide-descendants'}
      style={[styles.card, styles.stackedCard, { backgroundColor: palette.background }, animatedStyle]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: palette.text }]} numberOfLines={1}>{periodLabels[period].eyebrow}</Text>
        <PeriodToggle period={period} palette={palette} onPress={onToggle} />
      </View>

      <View style={styles.amountBlock}>
        <Text
          style={[styles.amount, { color: palette.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`${amount} ${periodLabels[period].unit}`}>
          {amount}
        </Text>
        {result.status === 'shortfall' && <Text style={[styles.shortfall, { color: palette.warning }]}>Shortfall expected before payday</Text>}
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="How this was calculated?"
        onPress={() => router.push(`/safe-to-spend-details?period=${period}` as Href)}
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && styles.dimmed]}>
        <Text style={[styles.linkText, { color: palette.text }]}>How this was calculated?</Text>
        <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} tintColor={palette.text} size={16} />
      </Pressable>
    </Animated.View>
  );
}

/** Shows only the current period; tapping switches to the other one. */
function PeriodToggle({ period, palette, onPress }: { period: SafeToSpendPeriod; palette: CardPalette; onPress: () => void }) {
  const next = otherPeriod(period);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Showing ${periodLabels[period].unit}. Switch to ${periodLabels[next].tile.toLowerCase()}`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.toggle, { backgroundColor: palette.toggleBackground }, pressed && styles.dimmed]}>
      <Text style={[styles.toggleText, { color: palette.toggleText }]}>{periodLabels[period].tile}</Text>
      <SymbolView
        name={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
        tintColor={palette.toggleText}
        size={14}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    height: cardHeight + peek,
  },
  card: {
    height: cardHeight,
    borderRadius: tileRadius,
    padding: 16,
    justifyContent: 'space-between',
  },
  stackedCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  placeholder: {
    marginBottom: peek,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eyebrow: {
    flexShrink: 1,
    color: ink,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: ink,
  },
  toggleText: {
    color: Bento.textOnSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  amountBlock: {
    gap: 2,
  },
  amount: {
    color: ink,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  shortfall: {
    color: Bento.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: inkMuted,
    fontSize: 13,
  },
  loader: {
    alignSelf: 'flex-start',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  linkText: {
    color: ink,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dimmed: {
    opacity: 0.6,
  },
});
