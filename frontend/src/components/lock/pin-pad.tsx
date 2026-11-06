import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PIN_LENGTH } from '@/lib/lock/rules';

const ACCENT = '#3F2FD6';
const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];

export type InputProps = {
  title: string;
  subtitle?: string;
  message?: string | null;
  disabled?: boolean;
  shakeKey?: number; // raise this to shake the field after a mistake
  autoFocus?: boolean;
  submitLabel?: string;
  onComplete: (secret: string) => void;
  onBiometric?: () => void; // shows the biometric key when given
};

export function useShake(shakeKey: number) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (shakeKey === 0) return;
    x.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeKey]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
}

export function PinPad({ title, subtitle, message, disabled, shakeKey = 0, onComplete, onBiometric }: InputProps) {
  const [digits, setDigits] = useState('');
  const digitsRef = useRef(''); // the real value, so two quick taps can't read a stale one
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shakeStyle = useShake(shakeKey);

  useEffect(() => () => clearTimeout(timer.current), []);

  function press(d: string) {
    if (disabled || busy.current || digitsRef.current.length >= PIN_LENGTH) return;
    digitsRef.current += d;
    setDigits(digitsRef.current);
    if (digitsRef.current.length === PIN_LENGTH) {
      busy.current = true;
      onComplete(digitsRef.current);
      // let the last dot show before clearing
      timer.current = setTimeout(() => {
        digitsRef.current = '';
        setDigits('');
        busy.current = false;
      }, 150);
    }
  }

  function back() {
    if (disabled || busy.current) return;
    digitsRef.current = digitsRef.current.slice(0, -1);
    setDigits(digitsRef.current);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <Animated.View
        style={[styles.dots, shakeStyle]}
        accessible
        accessibilityLabel={`${digits.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < digits.length && styles.dotFilled]} />
        ))}
      </Animated.View>

      <Text style={styles.message} accessibilityLiveRegion="polite">
        {message ?? ' '}
      </Text>

      <View style={styles.keys}>
        {ROWS.map((row) => (
          <View key={row[0]} style={styles.row}>
            {row.map((k) => (
              <Pressable
                key={k}
                onPress={() => press(k)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Digit ${k}`}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
                <Text style={styles.keyText}>{k}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          {onBiometric ? (
            <Pressable
              onPress={onBiometric}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Use biometrics"
              style={({ pressed }) => [styles.key, styles.keyPlain, pressed && styles.keyPressed]}>
              <Ionicons name="finger-print" size={30} color={ACCENT} />
            </Pressable>
          ) : (
            <View style={styles.key} />
          )}
          <Pressable
            onPress={() => press('0')}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Digit 0"
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
            <Text style={styles.keyText}>0</Text>
          </Pressable>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Delete"
            style={({ pressed }) => [styles.key, styles.keyPlain, pressed && styles.keyPressed]}>
            <Ionicons name="backspace-outline" size={26} color="#444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 14, marginTop: 28 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: ACCENT },
  dotFilled: { backgroundColor: ACCENT },
  message: { fontSize: 13, color: '#D6393F', marginTop: 14, minHeight: 36, textAlign: 'center', paddingHorizontal: 24 },
  keys: { gap: 14, marginTop: 8 },
  row: { flexDirection: 'row', gap: 22, justifyContent: 'center' },
  key: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EDE9FF', alignItems: 'center', justifyContent: 'center' },
  keyPlain: { backgroundColor: 'transparent' },
  keyPressed: { opacity: 0.55 },
  keyText: { fontSize: 28, fontWeight: '600', color: '#1A1A1A' },
});