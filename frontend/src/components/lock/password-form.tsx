import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, TextInput } from '@/components/app-text';
import Animated from 'react-native-reanimated';

import { PASSWORD_MAX } from '@/lib/lock/rules';

import { InputProps, useShake } from './pin-pad';

const ACCENT = '#3F2FD6';

export function PasswordForm({
  title, subtitle, message, disabled, shakeKey = 0, autoFocus, submitLabel = 'Continue', onComplete, onBiometric,
}: InputProps) {
  const [value, setValue] = useState('');
  const [shown, setShown] = useState(false);
  const shakeStyle = useShake(shakeKey);

  // after a mistake the field clears, so the next try starts clean
  useEffect(() => {
    if (shakeKey > 0) setValue('');
  }, [shakeKey]);

  const off = disabled || value.length === 0;
  const submit = () => {
    if (!off) onComplete(value);
  };

  return (
    <View style={styles.wrap}>
      <Text variant="heading" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <Animated.View style={[styles.field, shakeStyle]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          spellCheck={false}
          maxLength={PASSWORD_MAX}
          editable={!disabled}
          autoFocus={autoFocus}
          returnKeyType="done"
          onSubmitEditing={submit}
          placeholder="Password"
          placeholderTextColor="#AAA"
        />
        <Pressable onPress={() => setShown((s) => !s)} hitSlop={10} accessibilityLabel={shown ? 'Hide password' : 'Show password'}>
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color="#777" />
        </Pressable>
      </Animated.View>

      <Text style={styles.message} accessibilityLiveRegion="polite">
        {message ?? ' '}
      </Text>

      <Pressable style={[styles.button, off && styles.buttonOff]} disabled={off} onPress={submit}>
        <Text style={styles.buttonText}>{submitLabel}</Text>
      </Pressable>

      {onBiometric ? (
        <Pressable onPress={onBiometric} disabled={disabled} style={styles.bio}>
          <Ionicons name="finger-print" size={20} color={ACCENT} />
          <Text style={styles.bioText}>Use biometrics</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%', paddingHorizontal: 28 },
  title: {
    fontSize: 22,
    color: '#1A1A1A',
  },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center' },
  field: {
    flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 28,
    borderWidth: 1.5, borderColor: ACCENT, borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#FFF',
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 14, color: '#1A1A1A' },
  message: { fontSize: 13, color: '#D6393F', marginTop: 12, minHeight: 36, textAlign: 'center' },
  button: { width: '100%', backgroundColor: ACCENT, borderRadius: 20, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  buttonOff: { opacity: 0.4 },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  bio: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  bioText: { color: ACCENT, fontWeight: '600' },
});