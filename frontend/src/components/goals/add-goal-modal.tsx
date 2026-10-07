// frontend/src/components/goals/add-goal-modal.tsx
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  visible: boolean;
  mode: 'create' | 'topup';
  onClose: () => void;
  onSubmit: (data: { title: string; amount: string }) => void;
};

export function AddGoalModal({ visible, mode, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{mode === 'create' ? 'Add A New Goal' : 'Top Up A Goal'}</Text>

          {mode === 'create' && (
            <>
              <Text style={styles.label}>Goal title</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Travel to Mumbai" />
            </>
          )}

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
              onSubmit({ title, amount });
              setTitle('');
              setAmount('');
              onClose();
            }}>
            <Text style={styles.saveText}>{mode === 'create' ? 'Create Goal' : 'Top Up'}</Text>
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
    backgroundColor: '#9B4FE0',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#FFF', fontWeight: '700' },
});