// frontend/src/components/lock/unlock-screen.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PAGE_BACKGROUND } from '@/constants/colors';
// import { eraseEverything } from '@/lib/erase-data';
import { BiometricStatus, biometricStatus, promptBiometric } from '@/lib/lock/biometrics';
import { describeFailure } from '@/lib/lock/messages';
import { formatWait } from '@/lib/lock/rules';
import { lockoutRemaining, recordBiometricSuccess, verifySecret } from '@/lib/lock/service';
import { useLockStore } from '@/stores/lock-store';

import { SecretInput } from './secret-input';

export function UnlockScreen() {
  const insets = useSafeAreaInsets();
  const config = useLockStore((s) => s.config);
  const unlock = useLockStore((s) => s.unlock);

  const [message, setMessage] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [lockEndsAt, setLockEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [bio, setBio] = useState<BiometricStatus>('unavailable');
  const [working, setWorking] = useState(false);
  const triedBio = useRef(false);

  const label = config.kind === 'pin' ? 'PIN' : 'password';
  const secondsLeft = lockEndsAt === null ? 0 : Math.max(0, Math.ceil((lockEndsAt - now) / 1000));
  const lockedOut = secondsLeft > 0;

  const startLockout = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setLockEndsAt(t + seconds * 1000);
    setMessage(null);
  }, []);

  // a lockout survives closing the app
  useEffect(() => {
    lockoutRemaining()
      .then((s) => {
        if (s > 0) startLockout(s);
      })
      .catch(() => {});
  }, [startLockout]);

  useEffect(() => {
    if (!lockedOut) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedOut]);

  const tryBiometric = useCallback(async () => {
    const outcome = await promptBiometric('Unlock PesaPlan');
    if (outcome === 'success') {
      await recordBiometricSuccess();
      unlock();
    } else if (outcome === 'lockout') {
      setMessage(`Biometrics are locked for now. Use your ${label}.`);
    }
  }, [unlock, label]);

  // ask for biometrics once when the screen appears, if the user turned it on
  useEffect(() => {
    if (!config.biometrics) return;
    let alive = true;
    biometricStatus().then((s) => {
      if (!alive) return;
      setBio(s);
      if (s === 'ready' && !triedBio.current && AppState.currentState === 'active') {
        triedBio.current = true;
        setTimeout(() => {
          if (alive) tryBiometric();
        }, 300);
      }
    });
    return () => {
      alive = false;
    };
  }, [config.biometrics, tryBiometric]);

  async function submit(secret: string) {
    if (working || lockedOut) return;
    setWorking(true);
    try {
      const result = await verifySecret(secret);
      if (result.ok) {
        unlock();
        return;
      }
      setShakeKey((k) => k + 1);
      if (result.reason === 'locked') startLockout(result.secondsLeft);
      else setMessage(describeFailure(result, config.kind));
    } finally {
      setWorking(false);
    }
  }

  /**async function erase() {
    try {
      await eraseEverything();
      useLockStore.getState().reset();
      router.replace('/');
    } catch (e) {
      console.warn('erase failed', e);
      Alert.alert('Something went wrong', 'Nothing was erased. Please try again.');
    } 
  } */

  /**function forgot() {
    Alert.alert(
      `Forgot your ${label}?`,
      `A ${label} can't be recovered. If you erase everything, all transactions, budgets and settings on this phone are deleted and the app starts fresh. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase everything', style: 'destructive', onPress: erase },
      ]
    );
  } */

  const shown = lockedOut ? `Too many attempts. Try again in ${formatWait(secondsLeft)}.` : message;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.brand}>
        <Ionicons name="wallet" size={28} color="#3F2FD6" />
        <Text style={styles.brandText}>PesaPlan</Text>
      </View>

      <SecretInput
        kind={config.kind}
        title={`Enter your ${label}`}
        message={shown}
        disabled={lockedOut || working}
        shakeKey={shakeKey}
        submitLabel="Unlock"
        onComplete={submit}
        onBiometric={config.biometrics && bio === 'ready' ? tryBiometric : undefined}
      />

      {/* <Pressable onPress={forgot} hitSlop={10}>
        <Text style={styles.forgot}>Forgot your {label}?</Text>
      </Pressable> */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PAGE_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 20, fontWeight: '700', color: '#3F2FD6' },
  forgot: { color: '#666', fontSize: 13, textDecorationLine: 'underline' },
});