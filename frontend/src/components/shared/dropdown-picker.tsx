// frontend/src/components/shared/dropdown-picker.tsx
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function DropdownPicker({ label, options, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>{selected}</Text>
        <Ionicons name="chevron-down" size={14} color="#333" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={styles.option}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}>
                <Text style={[styles.optionText, opt === selected && styles.optionTextActive]}>
                  {opt}
                </Text>
                {opt === selected && <Ionicons name="checkmark" size={16} color="#3F2FD6" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  triggerText: { fontSize: 14, color: '#333', fontStyle: 'italic' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 40 },
  sheet: { backgroundColor: '#FFF', borderRadius: 16, padding: 16 },
  sheetTitle: { fontSize: 13, color: '#888', marginBottom: 8 },
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  optionText: { fontSize: 15, color: '#333' },
  optionTextActive: { color: '#3F2FD6', fontWeight: '700' },
});