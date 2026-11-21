import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text, TextInput } from '@/components/app-text';

import { getDb } from '@/lib/db/database';
import { saveParsedMany } from '@/lib/db/transactions';
import { parseMpesaSms } from '@/lib/sms/parse-mpesa';
import { splitMessages } from '@/lib/sms/split-messages';
import type { ParsedTransaction } from '@/lib/sms/types';

const ACCENT = '#3F2FD6';

function analyse(text: string) {
  const transactions: ParsedTransaction[] = [];
  let unreadable = 0;
  for (const chunk of splitMessages(text)) {
    const result = parseMpesaSms(chunk);
    if (result.ok) transactions.push(result.transaction);
    else if (result.reason !== 'missing_code') unreadable++; // no code means it isn't an M-Pesa message
  }
  return { transactions, unreadable };
}

type Result = { saved: number; duplicates: number; unreadable: number };

export function ImportPasteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText('');
      setResult(null);
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  const { transactions, unreadable } = useMemo(() => analyse(text), [text]);
  const found = transactions.length;

  let summary = 'Paste one or more M-Pesa messages.';
  if (text.trim()) {
    summary =
      found === 0 && unreadable === 0
        ? 'No M-Pesa messages found in that text.'
        : `${found} transaction${found === 1 ? '' : 's'} found${unreadable ? ` · ${unreadable} couldn't be read` : ''}`;
  }

  async function pasteFromClipboard() {
    const clip = await Clipboard.getStringAsync();
    if (clip) setText((prev) => (prev ? `${prev}\n${clip}` : clip));
  }

  async function runImport() {
    setSaving(true);
    setError(null);
    try {
      // one database transaction: either everything is saved or nothing is
      const { saved, duplicates } = await saveParsedMany(await getDb(), transactions);
      setResult({ saved, duplicates, unreadable });
    } catch (e) {
      console.warn('import failed', e);
      setError('Something went wrong while saving. Nothing was imported.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          {result ? (
            <>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark-circle" size={44} color="#1FA64A" />
              </View>
              <Text variant="heading" style={styles.title}>Import complete</Text>
              <Text style={styles.line}>
                {result.saved} transaction{result.saved === 1 ? '' : 's'} added
              </Text>
              {result.duplicates > 0 && (
                <Text style={styles.hint}>{result.duplicates} already in the app, so they were skipped.</Text>
              )}
              {result.unreadable > 0 && (
                <Text style={styles.hint}>
                  {result.unreadable} couldn't be read. These are usually message types the app
                  doesn't know yet, like Fuliza.
                </Text>
              )}
              <Pressable style={styles.primary} onPress={onClose}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text variant="heading" style={styles.title}>Paste messages</Text>
              <Text style={styles.subtitle}>
                Copy M-Pesa messages from your messages app and paste them here. Messages you've
                added before are skipped.
              </Text>

              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                multiline
                autoCorrect={false}
                autoCapitalize="none"
                placeholder="UEEMG49UN7 Confirmed. Ksh30.00 paid to…"
                placeholderTextColor="#AAA"
                textAlignVertical="top"
              />

              <Pressable style={styles.clipboard} onPress={pasteFromClipboard}>
                <Ionicons name="clipboard-outline" size={16} color={ACCENT} />
                <Text style={styles.clipboardText}>Paste from clipboard</Text>
              </Pressable>

              <Text style={styles.summary}>{summary}</Text>
              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable
                style={[styles.primary, (found === 0 || saving) && styles.disabled]}
                disabled={found === 0 || saving}
                onPress={runImport}>
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>
                    {found > 0 ? `Import ${found} transaction${found === 1 ? '' : 's'}` : 'Import'}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: {
    fontSize: 18,
  },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 14 },
  input: {
    height: 170,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1A1A1A',
  },
  clipboard: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  clipboardText: { color: ACCENT, fontWeight: '600', fontSize: 13 },
  summary: { fontSize: 13, color: '#555', marginTop: 12 },
  error: { fontSize: 13, color: '#D6393F', marginTop: 8 },
  primary: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryText: { color: '#FFF', fontWeight: '700' },
  disabled: { opacity: 0.4 },
  doneIcon: { alignItems: 'center', marginBottom: 8 },
  line: { fontSize: 15, color: '#1A1A1A', marginTop: 10 },
  hint: { fontSize: 13, color: '#888', marginTop: 6 },
});