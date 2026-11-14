import { type ReactNode } from 'react';
import { type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { UnrollReveal } from '@/components/unroll-reveal';
import type { ChatShortcut } from '@/features/chat/api';

const bankGreen = '#008044';
const ink = '#10201B';

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

function UnrollChip({ index, label, shortcut = false, disabled, accessibilityRole, onPress }: UnrollChipProps) {
  return (
    <UnrollReveal index={index} borderRadius={999} style={styles.row}>
      <Pressable
        accessibilityRole={accessibilityRole}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => (disabled || pressed) && styles.dimmed}>
        <ChipBody label={label} shortcut={shortcut} />
      </Pressable>
    </UnrollReveal>
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
