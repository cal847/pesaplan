import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAGE_BACKGROUND } from '@/constants/colors';
import { describeFailure, explainCheck } from '@/lib/lock/messages';
import { checkSecret, SecretKind } from '@/lib/lock/rules';
import { createSecret, verifySecret } from '@/lib/lock/service';

import { SecretInput } from './secret-input';

export type FlowMode = 'create' | 'change' | 'verify';
type Step = 'current' | 'kind' | 'new' | 'confirm';

type Props = {
  visible: boolean;
  mode: FlowMode;
  currentKind: SecretKind;
  onClose: () => void;
  onDone: (secret?: string) => void; // "verify" passes back the secret that was just checked
};

const KIND_OPTIONS: { kind: SecretKind; icon: keyof typeof Ionicons.glyphMap; name: string; hint: string }[] = [
  { kind: 'pin', icon: 'keypad-outline', name: '6-digit PIN', hint: 'Fast to type' },
  { kind: 'password', icon: 'text-outline', name: 'Password', hint: 'Stronger, 8 or more characters' },
];

export function SecretFlowModal({ visible, mode, currentKind, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('current');
  const [kind, setKind] = useState<SecretKind>('pin');
  const [candidate, setCandidate] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(mode === 'create' ? 'kind' : 'current');
    setKind(mode === 'change' ? currentKind : 'pin');
    setCandidate('');
    setMessage(null);
  }, [visible, mode, currentKind]);

  const fail = (text: string) => {
    setMessage(text);
    setShakeKey((k) => k + 1);
  };

  async function handle(secret: string) {
    if (working) return;
    setMessage(null);

    if (step === 'current') {
      setWorking(true);
      const result = await verifySecret(secret);
      setWorking(false);
      if (!result.ok) return fail(describeFailure(result, currentKind));
      if (mode === 'verify') {
        onDone(secret);
        onClose();
      } else {
        setStep('kind');
      }
      return;
    }

    if (step === 'new') {
      const check = checkSecret(kind, secret);
      if (check !== 'ok') return fail(explainCheck(kind, check));
      setCandidate(secret);
      setStep('confirm');
      return;
    }

    // confirm
    if (secret !== candidate) {
      setCandidate('');
      setStep('new');
      return fail("Those didn't match. Try again.");
    }
    setWorking(true);
    const saved = await createSecret(kind, secret);
    setWorking(false);
    if (saved === 'ok') {
      onDone();
      onClose();
    } else {
      fail('Something went wrong. Try again.');
    }
  }

  const noun = (k: SecretKind) => (k === 'pin' ? 'PIN' : 'password');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color="#1A1A1A" />
        </Pressable>

        <View style={styles.body}>
          {step === 'kind' && (
            <View style={styles.kindWrap}>
              <Text style={styles.title}>How do you want to unlock?</Text>
              {KIND_OPTIONS.map((o) => (
                <Pressable
                  key={o.kind}
                  style={styles.kindCard}
                  onPress={() => {
                    setKind(o.kind);
                    setStep('new');
                  }}>
                  <Ionicons name={o.icon} size={24} color="#3F2FD6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kindName}>{o.name}</Text>
                    <Text style={styles.kindHint}>{o.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </Pressable>
              ))}
            </View>
          )}

          {step === 'current' && (
            <SecretInput
              key="current"
              kind={currentKind}
              title={mode === 'verify' ? `Enter your ${noun(currentKind)}` : `Enter your current ${noun(currentKind)}`}
              subtitle={mode === 'verify' ? 'This turns the app lock off.' : undefined}
              message={message}
              disabled={working}
              shakeKey={shakeKey}
              autoFocus
              onComplete={handle}
            />
          )}

          {step === 'new' && (
            <SecretInput
              key="new"
              kind={kind}
              title={`Choose a ${noun(kind)}`}
              subtitle={kind === 'pin' ? 'Pick 6 digits you will remember.' : 'Use 8 or more characters.'}
              message={message}
              shakeKey={shakeKey}
              autoFocus
              onComplete={handle}
            />
          )}

          {step === 'confirm' && (
            <SecretInput
              key="confirm"
              kind={kind}
              title={`Confirm your ${noun(kind)}`}
              subtitle="Enter it once more."
              message={message}
              disabled={working}
              shakeKey={shakeKey}
              autoFocus
              onComplete={handle}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BACKGROUND },
  close: { alignSelf: 'flex-start', paddingHorizontal: 16 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 20 },
  kindWrap: { width: '100%', paddingHorizontal: 24 },
  kindCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16,
    backgroundColor: '#FFF', marginBottom: 12, borderWidth: 1, borderColor: '#E5E3F0',
  },
  kindName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  kindHint: { fontSize: 12, color: '#777', marginTop: 2 },
});