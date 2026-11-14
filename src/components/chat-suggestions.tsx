import { useRef, useState, type ReactNode } from 'react';
import { type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { ChatShortcut } from '@/features/chat/api';

const bankGreen = '#008044';
const ink = '#10201B';

// Rows unroll from their left edge, first → last, each starting shortly after the one above.
const initialDelay = 150;
const stagger = 120;
const unrollDuration = 380;

const shortcutTargets: Record<Exclude<ChatShortcut, 'none'>, { label: string; href: Href }> = {
  spending: { label: 'Open spending report', href: '/spending-report' as Href },
  anomaly: { label: 'Check unusual activity', href: '/anomaly-detection' as Href },
  savings: { label: 'Plan a savings goal', href: '/savings-goal' as Href },
};

type Props = {
  suggestions: string[];
  shortcut?: ChatShortcut;
  disabled?: boolean;
  onPick: (text: string) => void;
  onShortcut?: (href: Href) => void;
};

export function ChatSuggestions({ suggestions, shortcut = 'none', disabled = false, onPick, onShortcut }: Props) {
  const target = shortcut !== 'none' && onShortcut ? shortcutTargets[shortcut] : null;
  if (suggestions.length === 0 && !target) return null;

  return (
    <Animated.View exiting={FadeOut.duration(150)} style={styles.column}>
      {suggestions.map((suggestion, index) => (
        <UnrollChip
          key={suggestion}
          index={index}
          label={suggestion}
          disabled={disabled}
          accessibilityRole="button"
          onPress={() => onPick(suggestion)}
        />
      ))}
      {target && (
        <UnrollChip
          index={suggestions.length}
          label={target.label}
          shortcut
          disabled={disabled}
          accessibilityRole="link"
          onPress={() => onShortcut?.(target.href)}
        />
      )}
    </Animated.View>
  );
}

type UnrollChipProps = {
  index: number;
  label: string;
  shortcut?: boolean;
  disabled: boolean;
  accessibilityRole: 'button' | 'link';
  onPress: () => void;
};

/**
 * An invisible copy of the chip sizes the row; the visible chip sits in a clip whose width grows
 * from 0 to that size, so the text is uncovered left → right instead of reflowing or squashing.
 */
function UnrollChip({ index, label, shortcut = false, disabled, accessibilityRole, onPress }: UnrollChipProps) {
  const [width, setWidth] = useState(0);
  const started = useRef(false);
  const progress = useSharedValue(0);
  const targetWidth = useSharedValue(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.ceil(event.nativeEvent.layout.width);
    if (!measured) return;
    setWidth(measured);
    targetWidth.set(measured);
    if (started.current) return;
    started.current = true;
    progress.set(withDelay(
      initialDelay + index * stagger,
      withTiming(1, { duration: unrollDuration, easing: Easing.out(Easing.cubic) }),
    ));
  };

  const clipStyle = useAnimatedStyle(() => ({
    width: progress.value * targetWidth.value,
    opacity: interpolate(progress.value, [0, 0.2], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.row}>
      <View
        pointerEvents="none"
        style={styles.sizer}
        onLayout={onLayout}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <ChipBody label={label} shortcut={shortcut} />
      </View>

      <Animated.View style={[styles.clip, clipStyle]}>
        {width > 0 && (
          <Pressable
            accessibilityRole={accessibilityRole}
            accessibilityLabel={label}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [{ width }, (disabled || pressed) && styles.dimmed]}>
            <ChipBody label={label} shortcut={shortcut} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

function ChipBody({ label, shortcut }: { label: string; shortcut: boolean }): ReactNode {
  return (
    <View style={[styles.chip, shortcut && styles.shortcutChip]}>
      <Text style={[styles.chipText, shortcut && styles.shortcutText]}>{label}</Text>
      {shortcut && (
        <SymbolView
          name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
          tintColor={bankGreen}
          size={14}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'flex-start',
    gap: 8,
  },
  row: {
    maxWidth: '85%',
  },
  sizer: {
    opacity: 0,
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 999,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    flexShrink: 1,
    color: ink,
    fontSize: 14,
  },
  shortcutChip: {
    backgroundColor: 'transparent',
    borderColor: bankGreen,
  },
  shortcutText: {
    color: bankGreen,
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.5,
  },
});
