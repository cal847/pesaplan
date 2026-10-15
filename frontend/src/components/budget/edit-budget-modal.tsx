import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BudgetItem, formatAmount, parseAmount } from './budget-data';

const EMOJIS = [
  '🍽️', '🏠', '💧', '⚡', '📶', '🚌', '🛒', '🎬', '🎵', '▶️', '💼', '💰',
  '🏛️', '🐷', '📈', '🏦', '🎓', '🏥', '👕', '🎁', '✈️', '🐶', '☕', '📱',
];

const COLORS = [
  '#B8EBC5', '#A8E6D8', '#F5E6A8', '#A8D8F0', '#C8E8D8', '#F0A8D8',
  '#F5C8E0', '#F5E0E8', '#F0A8A0', '#F5C8C0', '#F5E0D8', '#D3CCF7',
];

type Props = {
  visible: boolean;
  item: BudgetItem | null;
  sectionTitle?: string;
  takenNames: string[];
  onClose: () => void;
  onSave: (value: BudgetItem) => void;
};

export function EditBudgetModal({ visible, item, sectionTitle, takenNames, onClose, onSave }: Props) {
  const [heading, setHeading] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [icon, setIcon] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!visible) return;
    setHeading(item ? `Edit ${item.name}` : `Add to ${sectionTitle ?? 'category'}`);
    setName(item?.name ?? '');
    setAmount(item ? String(parseAmount(item.amount)) : '');
    setIcon(item?.icon ?? EMOJIS[0]);
    setColor(item?.backgroundColor ?? COLORS[0]);
  }, [visible]);

  function handleAmount(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const dot = cleaned.indexOf('.');
    if (dot === -1) return setAmount(cleaned);
    const decimals = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    setAmount(`${cleaned.slice(0, dot)}.${decimals}`);
  }

  const trimmed = name.trim();
  const value = parseFloat(amount);
  const duplicate = takenNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const valid = trimmed.length > 0 && Number.isFinite(value) && value > 0 && !duplicate;

  function submit() {
    if (!valid) return;
    onSave({ icon, name: trimmed, amount: formatAmount(value), backgroundColor: color });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{heading}</Text>

            <View style={[styles.preview, { backgroundColor: color }]}>
              <Text style={styles.previewIcon}>{icon}</Text>
              <Text style={styles.previewName} numberOfLines={1}>
                {trimmed || 'Name'}
              </Text>
              <Text style={styles.previewAmount}>
                {formatAmount(Number.isFinite(value) ? value : 0)}
              </Text>
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              maxLength={16} 
              placeholder="e.g. Groceries"
              placeholderTextColor="#AAA"
            />
            {duplicate && <Text style={styles.error}>That name is already used in this category.</Text>}

            <Text style={styles.label}>Amount (Ksh)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={handleAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#AAA"
            />

            <Text style={styles.label}>Icon</Text>
            <View style={styles.grid}>
              {EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => setIcon(emoji)}
                  style={[styles.emojiCell, emoji === icon && styles.emojiCellActive]}>
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Colour</Text>
            <View style={styles.grid}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchActive]}
                />
              ))}
            </View>

            <Pressable
              style={[styles.saveButton, !valid && styles.saveDisabled]}
              disabled={!valid}
              onPress={submit}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </ScrollView>
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
    maxHeight: '88%',
  },
  content: { padding: 24 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  preview: { alignSelf: 'center', width: 108, borderRadius: 14, padding: 10, marginBottom: 8 },
  previewIcon: { fontSize: 16 },
  previewName: { fontWeight: '700', fontSize: 12, marginTop: 4, color: '#1A1A1A' },
  previewAmount: { fontSize: 11, color: '#333', marginTop: 2 },
  label: { fontSize: 13, color: '#888', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 10, fontSize: 15 },
  error: { fontSize: 12, color: '#D6393F', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F5FA',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCellActive: { borderColor: '#4B0082', backgroundColor: '#EDE9FF' },
  emoji: { fontSize: 22 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  swatchActive: { borderColor: '#4B0082' },
  saveButton: {
    backgroundColor: '#0c8e05b9',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFF', fontWeight: '700' },
});