import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { DONATION_NUMBER, formatPhone, toDialable } from '@/lib/donate';

const ACCENT = '#3F2FD6';

export function DonateNumber() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await Clipboard.setStringAsync(toDialable(DONATION_NUMBER));
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Pressable
      style={styles.box}
      onPress={copy}
      accessibilityRole="button"
      accessibilityLabel={`Copy donation number ${formatPhone(DONATION_NUMBER)}`}>
      <Ionicons name="call-outline" size={18} color={ACCENT} />
      <Text style={styles.number}>{formatPhone(DONATION_NUMBER)}</Text>
      <Ionicons
        name={copied ? 'checkmark-circle' : 'copy-outline'}
        size={18}
        color={copied ? '#1FA64A' : ACCENT}
      />
      <Text style={[styles.status, copied && styles.statusDone]}>{copied ? 'Copied' : 'Tap to copy'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEEBFF',
  },
  number: { fontSize: 15, fontWeight: '700', color: ACCENT, flex: 1 },
  status: { fontSize: 12, color: '#666' },
  statusDone: { color: '#1FA64A', fontWeight: '600' },
});