import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

// Items unroll from their left edge, first → last, each starting shortly after the one before.
const initialDelay = 150;
const stagger = 120;
const unrollDuration = 380;

type Props = {
  index: number;
  borderRadius: number;
  /** Style of the outer slot (e.g. maxWidth, flex). */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * An invisible copy of the content sizes the slot; the visible copy sits in a clip whose width grows
 * from 0 to that size, so the content is uncovered left → right instead of reflowing or squashing.
 */
export function UnrollReveal({ index, borderRadius, style, children }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const started = useRef(false);
  const progress = useSharedValue(0);
  const targetWidth = useSharedValue(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = Math.ceil(event.nativeEvent.layout.width);
    const height = Math.ceil(event.nativeEvent.layout.height);
    if (!width || !height) return;
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    targetWidth.set(width);
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
    <View style={style}>
      <View
        pointerEvents="none"
        style={styles.sizer}
        onLayout={onLayout}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {children}
      </View>

      <Animated.View style={[styles.clip, { borderRadius }, clipStyle]}>
        {size.width > 0 && <View style={size}>{children}</View>}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sizer: {
    opacity: 0,
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
