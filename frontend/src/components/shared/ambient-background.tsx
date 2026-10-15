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

type RGB = [number, number, number];

const rgba = ([r, g, b]: RGB, a: number) =>
  `rgba(${r},${g},${b},${a})`;

/* ---------------------------------- Bands --------------------------------- */

type Band = {
  top: number;
  height: number;
  rgb: RGB;
  alpha: number;
  angle: number;
  rotateAmp: number;
  driftY: number;
  duration: number;
  invert?: boolean;
};

const BANDS: Band[] = [
  {
    top: -0.06,
    height: 0.44,
    rgb: [124, 92, 255],
    alpha: 0.3,
    angle: -10,
    rotateAmp: 2.5,
    driftY: 18,
    duration: 11000,
  },
  {
    top: 0.28,
    height: 0.38,
    rgb: [170, 120, 255],
    alpha: 0.2,
    angle: 8,
    rotateAmp: 3,
    driftY: 22,
    duration: 15000,
    invert: true,
  },
  {
    top: 0.58,
    height: 0.42,
    rgb: [110, 90, 245],
    alpha: 0.16,
    angle: -6,
    rotateAmp: 2,
    driftY: 16,
    duration: 19000,
  },
];

function GradientBand({
  band,
  width,
  height,
}: {
  band: Band;
  width: number;
  height: number;
}) {
  const {
    top,
    height: bandHeight,
    rgb,
    alpha,
    angle,
    rotateAmp,
    driftY,
    duration,
    invert,
  } = band;

  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    t.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [duration, reduceMotion, t]);

  const dir = invert ? -1 : 1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          t.value,
          [0, 1],
          [-driftY * dir, driftY * dir]
        ),
      },
      {
        rotate: `${angle + interpolate(
          t.value,
          [0, 1],
          [-rotateAmp * dir, rotateAmp * dir]
        )}deg`,
      },
    ],
  }));

  const bandWidth = width * 2;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: height * top,
          left: -width * 0.5,
          width: bandWidth,
          height: height * bandHeight,
        },
        animatedStyle,
      ]}
    >
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

/* ---------------------------------- Blobs --------------------------------- */

type Blob = {
  cx: number;
  cy: number;
  size: number;
  rgb: RGB;
  alpha: number;
  driftX: number;
  driftY: number;
  duration: number;
};

const BLOBS: Blob[] = [
  {
    cx: 0.9,
    cy: 0.06,
    size: 0.9,
    rgb: [248, 246, 255],
    alpha: 0.34,
    driftX: -14,
    driftY: 16,
    duration: 13000,
  },
  {
    cx: 0.4,
    cy: 0.5,
    size: 1.0,
    rgb: [239, 234, 255],
    alpha: 0.22,
    driftX: 18,
    driftY: -14,
    duration: 17000,
  },
];

const BLOB_LAYERS = 12;

function SoftBlob({
  blob,
  width,
  height,
}: {
  blob: Blob;
  width: number;
  height: number;
}) {
  const { cx, cy, size, rgb, alpha, driftX, driftY, duration } = blob;

  const t = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    t.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [duration, reduceMotion, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(t.value, [0, 1], [-driftX, driftX]),
      },
      {
        translateY: interpolate(t.value, [0, 1], [-driftY, driftY]),
      },
      {
        scale: interpolate(t.value, [0, 1], [1, 1.06]),
      },
    ],
  }));

  const diameter = width * size;
  const layerAlpha = 1 - Math.pow(1 - alpha, 1 / BLOB_LAYERS);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: width * cx - diameter / 2,
          top: height * cy - diameter / 2,
          width: diameter,
          height: diameter,
        },
        animatedStyle,
      ]}
    >
      {Array.from({ length: BLOB_LAYERS }).map((_, index) => {
        const layerDiameter = diameter * (1 - index / BLOB_LAYERS);

        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: (diameter - layerDiameter) / 2,
              top: (diameter - layerDiameter) / 2,
              width: layerDiameter,
              height: layerDiameter,
              borderRadius: layerDiameter / 2,
              backgroundColor: rgba(rgb, layerAlpha),
            }}
          />
        );
      })}
    </Animated.View>
  );
}

/* ------------------------------- Top light ------------------------------- */

const TOP_LIGHT = {
  /** How far down the screen the lighter area reaches. */
  heightFraction: 1,

  /** White opacity at the very top. Higher = lighter. */
  topAlpha: 0.35,

  /** White opacity in the middle of the gradient. Lower = subtler. */
  middleAlpha: 0.32,

  /** Where the middle stop sits, from 0 (top) to 1 (bottom of overlay). */
  middleLocation: 0.42,
};

function TopLight({ height }: { height: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[
        `rgba(255, 255, 255, ${TOP_LIGHT.topAlpha})`,
        `rgba(255, 255, 255, ${TOP_LIGHT.middleAlpha})`,
        'rgba(255, 255, 255, 0)',
      ]}
      locations={[0, TOP_LIGHT.middleLocation, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * TOP_LIGHT.heightFraction,
      }}
    />
  );
}

/* ------------------------------- Background ------------------------------- */

type Props = {
  scrollY?: SharedValue<number>;
};

export function AmbientBackground({ scrollY }: Props) {
  const { width, height } = useWindowDimensions();

  const fallback = useSharedValue(0);
  const y = scrollY ?? fallback;

  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          y.value,
          [0, 400],
          [0, -30],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip]}
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, parallaxStyle]}>
        {BANDS.map((band, index) => (
          <GradientBand
            key={`band-${index}`}
            band={band}
            width={width}
            height={height}
          />
        ))}

        {BLOBS.map((blob, index) => (
          <SoftBlob
            key={`blob-${index}`}
            blob={blob}
            width={width}
            height={height}
          />
        ))}

        <TopLight height={height} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});