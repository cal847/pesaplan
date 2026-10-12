// frontend/src/components/budget/edit-budget-modal.tsx
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type BudgetItem = { icon: string; name: string; amount: string; backgroundColor: string };

type Props = {
  item: BudgetItem | null;
  onClose: () => void;
  onSave: (updated: BudgetItem) => void;
};

export function EditBudgetModal({ item, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setAmount(item.amount.replace(/[^0-9.]/g, ''));
    }
  }, [item]);

  if (!item) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Edit {item.name}</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Amount (Ksh)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />

          <Pressable
            style={styles.saveButton}
            onPress={() => {
              onSave({ ...item, name, amount: `Ksh ${amount}` });
              onClose();
            }}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 13, color: '#888', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 10, fontSize: 15 },
  saveButton: {
    backgroundColor: '#3F2FD6',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#FFF', fontWeight: '700' },
});