import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/app-text';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDeleteModal({
  visible,
  title = 'Delete item?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = loading || isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Pressable
          style={styles.sheet}
          onPress={(event) => event.stopPropagation()}
        >          
          <Text variant="heading" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={busy}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.deleteButton, busy && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 2, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FDECEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    color: '#07022A',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEEBFF',
  },
  cancelText: {
    color: '#3F2FD6',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#D6393F',
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
});