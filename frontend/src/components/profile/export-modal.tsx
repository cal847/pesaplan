import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';

import { getDb } from '@/lib/db/database';
import { countBetween } from '@/lib/db/transactions';
import { EXPORT_PERIODS, ExportPeriod, exportRange } from '@/lib/export/range';
import { ExportFormat, exportTransactions } from '@/lib/export/share';

const ACCENT = '#3F2FD6';

const FORMATS: { id: ExportFormat; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'pdf', label: 'PDF', hint: 'Easy to read and print', icon: 'document-text-outline' },
  { id: 'txt', label: 'Text', hint: 'Plain text file', icon: 'reader-outline' },
  { id: 'csv', label: 'CSV', hint: 'For Excel and Sheets', icon: 'grid-outline' },
];

export function ExportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [period, setPeriod] = useState<ExportPeriod>('This month');
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBusy(false);
      setMessage(null);
    }
  }, [visible]);

  // how many transactions the chosen period contains
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setCount(null);
    const { from, to } = exportRange(period);
    getDb()
      .then((db) => countBetween(db, from, to))
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, period]);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await exportTransactions(format, period);
      if (outcome === 'shared') onClose();
      else if (outcome === 'empty') setMessage('There are no transactions in that period.');
      else setMessage("Sharing isn't available on this device.");
    } catch (e) {
      console.warn('export failed', e);
      setMessage('The export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const countText =
    count === null
      ? 'Counting…'
      : count === 0
        ? 'No transactions in this period'
        : `${count} transaction${count === 1 ? '' : 's'}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <Text variant="heading" style={styles.title}>Export transactions</Text>

          <Text style={styles.label}>Format</Text>
          <View style={styles.formats}>
            {FORMATS.map((f) => {
              const active = f.id === format;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFormat(f.id)}
                  style={[styles.format, active && styles.formatActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}>
                  <Ionicons name={f.icon} size={22} color={active ? ACCENT : '#777'} />
                  <Text style={[styles.formatLabel, active && styles.formatLabelActive]}>{f.label}</Text>
                  <Text style={styles.formatHint}>{f.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Period</Text>
          <View style={styles.chips}>
            {EXPORT_PERIODS.map((p) => {
              const active = p === period;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.count}>{countText}</Text>
          {message && <Text style={styles.error}>{message}</Text>}

          <Pressable
            style={[styles.primary, (busy || count === 0 || count === null) && styles.disabled]}
            disabled={busy || count === 0 || count === null}
            onPress={run}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Export</Text>}
          </Pressable>

          <Text style={styles.warning}>
            Exports contain your financial details. Share them only with people you trust.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: {
    fontSize: 18,
    marginBottom: 6,
  },
  label: { fontSize: 13, color: '#888', marginTop: 16, marginBottom: 8 },
  formats: { flexDirection: 'row', gap: 10 },
  format: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F6F5FA',
  },
  formatActive: { borderColor: ACCENT, backgroundColor: '#EDE9FF' },
  formatLabel: { fontWeight: '700', marginTop: 6, color: '#444' },
  formatLabelActive: { color: ACCENT },
  formatHint: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F6F5FA' },
  chipActive: { backgroundColor: ACCENT },
  chipText: { fontSize: 13, color: '#444', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  count: { fontSize: 13, color: '#555', marginTop: 14 },
  error: { fontSize: 13, color: '#D6393F', marginTop: 8 },
  primary: { backgroundColor: ACCENT, borderRadius: 20, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#FFF', fontWeight: '700' },
  disabled: { opacity: 0.4 },
  warning: { fontSize: 11, color: '#999', marginTop: 12, textAlign: 'center' },
});