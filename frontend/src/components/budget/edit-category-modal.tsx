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

const MAX_LENGTH = 40;

type Props = {
  visible: boolean;
  currentTitle: string;
  onClose: () => void;
  onSave: (newTitle: string) => void;
};

export function EditCategoryModal({ visible, currentTitle, onClose, onSave }: Props) {
  const [text, setText] = useState('');

  // reset the field each time the sheet opens, so a cancelled edit doesn't linger
  useEffect(() => {
    if (visible) setText(currentTitle);
  }, [visible, currentTitle]);

  const trimmed = text.trim();
  const unchanged = trimmed === currentTitle.trim();
  const valid = trimmed.length > 0 && !unchanged;

  function submit() {
    if (!valid) return;
    onSave(trimmed);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <Text variant="heading" style={styles.title}>Rename Category</Text>
          <Text style={styles.subtitle}>Shown as the section heading on your budget.</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              maxLength={MAX_LENGTH}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={submit}
              placeholder="Category name"
              placeholderTextColor="#AAA"
            />
            <Text style={styles.counter}>
              {text.length}/{MAX_LENGTH}
            </Text>
          </View>

          <Pressable
            style={[styles.saveButton, !valid && styles.saveDisabled]}
            disabled={!valid}
            onPress={submit}>
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
    fontSize: 18,
  },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '600', paddingVertical: 12, color: '#1A1A1A' },
  counter: { fontSize: 11, color: '#AAA', marginLeft: 8 },
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