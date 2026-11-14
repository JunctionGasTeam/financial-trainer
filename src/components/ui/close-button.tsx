import { Pressable, StyleSheet, Text } from 'react-native';

const ink = '#10201B';

export const closeButtonSize = 38;

type CloseButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

/** Round close button shared by full-screen views (matches the Coach chat header). */
export function CloseButton({ onPress, accessibilityLabel }: CloseButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.glyph}>×</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: closeButtonSize,
    height: closeButtonSize,
    borderRadius: closeButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  glyph: {
    color: ink,
    fontSize: 26,
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.5,
  },
});
