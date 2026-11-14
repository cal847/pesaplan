import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text, TextInput } from '@/components/app-text';

type Props = {
  visible: boolean;
  currentLimit: number;
  onClose: () => void;
  onSave: (value: number) => void;
};

export function EditLimitModal({ visible, currentLimit, onClose, onSave }: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) setText(String(currentLimit));
  }, [visible, currentLimit]);

  const value = parseFloat(text);
  const valid = Number.isFinite(value) && value > 0;

  // digits only, one decimal point, max two decimals
  function handleChange(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const dot = cleaned.indexOf('.');
    if (dot === -1) return setText(cleaned);
    const whole = cleaned.slice(0, dot);
    const decimals = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    setText(`${whole}.${decimals}`);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <Text variant="heading" style={styles.title}>Spending Limit</Text>
          <Text style={styles.subtitle}>Budget alerts are based on this amount.</Text>

          <View style={styles.inputRow}>
            <Text style={styles.prefix}>KSh</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={handleChange}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
            />
          </View>

          <Pressable
            style={[styles.saveButton, !valid && styles.saveDisabled]}
            disabled={!valid}
            onPress={() => {
              onSave(value);
              onClose();
            }}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 15,
    marginBottom: 10,
  },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  prefix: { fontSize: 16, fontWeight: '700', color: '#3F2FD6', marginRight: 8 },
  input: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 12, color: '#1A1A1A' },
  saveButton: {
    backgroundColor: '#3F2FD6',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFF', fontWeight: '700' },
});