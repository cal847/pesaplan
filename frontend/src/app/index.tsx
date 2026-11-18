/**
 * Splash screen route.
 */
import { KaushanScript_400Regular, useFonts } from '@expo-google-fonts/kaushan-script';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useSettingsStore } from '@/stores/settings-store';

const TAGLINE = 'Plan. Save. Master.';
const MIN_DISPLAY_MS = 2600; // so the animation always finishes and can be read
const MAX_WAIT_MS = 6000; // safety net: never get stuck here
const TAGLINE_START = 650; // ms after the content appears
const LETTER_STAGGER = 45; // ms between letters, which is what makes the wave

/** True once the persisted settings (theme, lock) have loaded from storage. */
function useHydrated() {
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSettingsStore.persist.hasHydrated());
    return unsubscribe;
  }, []);

  return hydrated;
}

function WaveLetter({ char, index, reduceMotion }: { char: string; index: number; reduceMotion: boolean }) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // low damping makes the spring overshoot, so each letter rises past its
    // resting spot and settles back
    progress.value = withDelay(
      TAGLINE_START + index * LETTER_STAGGER,
      withSpring(1, { damping: 6, stiffness: 140, mass: 0.7 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 3),
    transform: [{ translateY: (1 - progress.value) * 18 }],
  }));

  return (
    <Animated.Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tagline, style]}>
      {char === ' ' ? '\u00A0' : char}
    </Animated.Text>
  );
}

export default function SplashRoute() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [fontsLoaded, fontError] = useFonts({ KaushanScript_400Regular });
  const fontsReady = fontsLoaded || !!fontError; // a failed font shouldn't block the app
  const hydrated = useHydrated();

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [maxTimePassed, setMaxTimePassed] = useState(false);
  const nativeHidden = useRef(false);
  const navigated = useRef(false);

  const iconProgress = useSharedValue(0);
  const wordProgress = useSharedValue(0);
  const spinnerOpacity = useSharedValue(0);
  const spin = useSharedValue(0);

  const hideNativeSplash = useCallback(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // safety net timer starts immediately
  useEffect(() => {
    const t = setTimeout(() => setMaxTimePassed(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  // animations start once the font is ready, so the wordmark never flashes in a fallback font
  useEffect(() => {
    if (!fontsReady) return;

    if (reduceMotion) {
      iconProgress.value = 1;
      wordProgress.value = 1;
      spinnerOpacity.value = 1;
    } else {
      iconProgress.value = withSpring(1, { damping: 9, stiffness: 120 });
      wordProgress.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 110 }));
      spinnerOpacity.value = withDelay(1500, withTiming(1, { duration: 300 }));
      spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
    }

    const t = setTimeout(() => setMinTimePassed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [fontsReady]);

  // leave when ready, or when the safety net trips
  const canLeave = (fontsReady && hydrated && minTimePassed) || maxTimePassed;

  useEffect(() => {
    if (!canLeave || navigated.current) return;
    navigated.current = true;
    hideNativeSplash(); // in case the content never got to lay out
    // TODO: once auth exists, choose '/login' or '/home' here based on the saved session
    router.replace('/home');
  }, [canLeave]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, iconProgress.value * 2),
    transform: [{ scale: 0.6 + 0.4 * iconProgress.value }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, wordProgress.value * 2),
    transform: [{ translateY: (1 - wordProgress.value) * 16 }],
  }));

  const spinnerWrapStyle = useAnimatedStyle(() => ({ opacity: spinnerOpacity.value }));
  const spinnerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F3F0FF', '#FFFFFF', '#EEE9FF']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {fontsReady && (
        <>
          {/* the native splash is hidden only after this has laid out, so there's no blank flash */}
          <View style={styles.content} onLayout={hideNativeSplash}>
            <Animated.View style={[styles.iconBox, iconStyle]}>
              <Ionicons name="wallet" size={44} color="#3F2FD6" />
            </Animated.View>

            <Animated.Text accessibilityRole="header" style={[styles.wordmark, wordStyle]}>
              PesaBudge
            </Animated.Text>

            <View style={styles.taglineRow} accessible accessibilityLabel={TAGLINE}>
              {TAGLINE.split('').map((char, i) => (
                <WaveLetter key={i} char={char} index={i} reduceMotion={reduceMotion} />
              ))}
            </View>
          </View>

          <Animated.View style={[styles.spinnerWrap, spinnerWrapStyle]}>
            <Animated.View style={[styles.spinner, spinnerStyle]} />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F3FF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 12px 28px rgba(109, 79, 242, 0.28)', // the soft purple glow under the icon
  },
  wordmark: {
    marginTop: 22,
    fontSize: 38,
    fontFamily: 'KaushanScript_400Regular',
    color: '#3F2FD6',
  },
  taglineRow: { flexDirection: 'row', marginTop: 8 },
  tagline: { fontSize: 16, letterSpacing: 0.4, color: '#4B3FD9' },

  spinnerWrap: { position: 'absolute', bottom: 90, alignSelf: 'center' },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#DAD4FB', // faint track
    borderTopColor: '#3F2FD6', // the moving arc
  },
});