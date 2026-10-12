// frontend/src/components/shared/ambient-background.tsx
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Band = {
  top: number; // fraction of screen height
  height: number; // fraction of screen height
  rgb: [number, number, number];
  alpha: number; // peak opacity at the band's center
  angle: number; // base tilt in degrees
  rotateAmp: number; // sway in degrees
  driftY: number; // vertical drift in px
  duration: number; // ms for one half-sway
  invert?: boolean; // sways the opposite way
};

const BANDS: Band[] = [
  { top: -0.06, height: 0.44, rgb: [124, 92, 255], alpha: 0.3, angle: -10, rotateAmp: 2.5, driftY: 18, duration: 11000 },
  { top: 0.28, height: 0.38, rgb: [170, 120, 255], alpha: 0.2, angle: 8, rotateAmp: 3, driftY: 22, duration: 15000, invert: true },
  { top: 0.58, height: 0.42, rgb: [110, 90, 245], alpha: 0.16, angle: -6, rotateAmp: 2, driftY: 16, duration: 19000 },
];

const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

function GradientBand({ band, width, height }: { band: Band; width: number; height: number }) {
  const { top, height: h, rgb, alpha, angle, rotateAmp, driftY, duration, invert } = band;
  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion]);

  const dir = invert ? -1 : 1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [-driftY * dir, driftY * dir]) },
      { rotate: `${angle + interpolate(t.value, [0, 1], [-rotateAmp * dir, rotateAmp * dir])}deg` },
    ],
  }));

  // Twice the screen width so the left/right edges stay off-screen after rotating.
  // The only visible edges are top and bottom, and those fade to 0 alpha.
  const bandWidth = width * 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: height * top, left: -width * 0.5, width: bandWidth, height: height * h },
        animatedStyle,
      ]}>
      <LinearGradient
        colors={[rgba(rgb, 0), rgba(rgb, alpha), rgba(rgb, 0)]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

type Props = { scrollY?: SharedValue<number> };

export function AmbientBackground({ scrollY }: Props) {
  const { width, height } = useWindowDimensions();
  const fallback = useSharedValue(0);
  const y = scrollY ?? fallback;

  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [0, 400], [0, -30], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, parallaxStyle]}>
        {BANDS.map((band, i) => (
          <GradientBand key={i} band={band} width={width} height={height} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});