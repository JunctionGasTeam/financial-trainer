import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { BackHandler, Dimensions, Keyboard, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';

const openDuration = 420;
const closeDuration = 360;
const cornerRadius = 40;

type WipeState = {
  /** Plays the closing wipe, then navigates back. Safe to call more than once. */
  close: () => void;
  /** True once the opening wipe has finished — use it to defer heavy content or focus inputs. */
  opened: boolean;
};

const WipeContext = createContext<WipeState>({ close: () => router.back(), opened: true });

export const useWipe = () => useContext(WipeContext);

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace('/');
};

type WipeScreenProps = {
  /** Colour of the sheet that sweeps across the screen. Defaults to the theme background. */
  color?: string;
  /** Edge the sheet enters from. */
  from?: 'bottom' | 'top' | 'right';
  children: ReactNode;
};

/**
 * Screen transition shared by every overlay route: a solid sheet sweeps in from an edge with rounded
 * leading corners, the content fades in once the sheet nearly covers the screen, and closing plays it in
 * reverse. Routes using it must be registered as `transparentModal` with `animation: 'none'`.
 */
export function WipeScreen({ color, from = 'bottom', children }: WipeScreenProps) {
  const theme = useTheme();
  const sheetColor = color ?? theme.background;
  const { height, width } = Dimensions.get('screen');
  const progress = useSharedValue(0);
  const closingRef = useRef(false);
  const [opened, setOpened] = useState(false);
  const markOpened = useCallback(() => setOpened(true), []);

  const sheetStyle = useAnimatedStyle(() => {
    const radius = interpolate(progress.value, [0, 1], [cornerRadius, 0]);
    const remaining = 1 - progress.value;
    if (from === 'right') {
      return {
        transform: [{ translateX: remaining * width }],
        borderTopLeftRadius: radius,
        borderBottomLeftRadius: radius,
      };
    }
    const offset = remaining * height;
    return from === 'bottom'
      ? { transform: [{ translateY: offset }], borderTopLeftRadius: radius, borderTopRightRadius: radius }
      : { transform: [{ translateY: -offset }], borderBottomLeftRadius: radius, borderBottomRightRadius: radius };
  });
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.7, 1], [0, 1], 'clamp'),
  }));

  useEffect(() => {
    progress.set(withTiming(1, { duration: openDuration, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(markOpened);
    }));
  }, [progress, markOpened]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    progress.set(withTiming(0, { duration: closeDuration, easing: Easing.in(Easing.cubic) }, () => {
      scheduleOnRN(goBack);
    }));
  }, [progress]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close]);

  const value = useMemo(() => ({ close, opened }), [close, opened]);

  return (
    <WipeContext.Provider value={value}>
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.sheet, { height, backgroundColor: sheetColor }, sheetStyle]}
        />
        <Animated.View style={[styles.root, contentStyle]}>{children}</Animated.View>
      </View>
    </WipeContext.Provider>
  );
}

/** Stack screen options every `WipeScreen` route needs. */
export const wipeScreenOptions = {
  presentation: 'transparentModal',
  animation: 'none',
  gestureEnabled: false,
  contentStyle: { backgroundColor: 'transparent' },
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
