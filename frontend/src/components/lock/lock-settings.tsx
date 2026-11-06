import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ROW_GUTTER } from '@/components/profile/disclosure-row';
import { DropdownPicker } from '@/components/shared/dropdown-picker';
import { BiometricStatus, biometricStatus, promptBiometric } from '@/lib/lock/biometrics';
import { TIMEOUT_OPTIONS } from '@/lib/lock/rules';
import { disableLock, setBiometrics, setTimeoutSec } from '@/lib/lock/service';
import { useLockStore } from '@/stores/lock-store';

import { FlowMode, SecretFlowModal } from './secret-flow-modal';

const ACCENT = '#3F2FD6';
const TIMEOUT_LABELS = TIMEOUT_OPTIONS.map((o) => o.label);

const BIO_HINT: Record<BiometricStatus, string> = {
  ready: 'Fingerprint or face, with your PIN or password as backup',
  weak_only: "Only camera-based face unlock is set up, which this app can't use. Add a fingerprint in your phone's settings.",
  not_enrolled: "Add a fingerprint or face in your phone's settings first.",
  unavailable: "This phone doesn't support biometrics.",
};

function Divider() {
  return <View style={styles.divider} />;
}

/** The lock rows for the Profile card. Each row ends with its own divider. */
export function LockSettings() {
  const config = useLockStore((s) => s.config);
  const refresh = useLockStore((s) => s.refresh);
  const [flow, setFlow] = useState<FlowMode | null>(null);
  const [bio, setBio] = useState<BiometricStatus>('unavailable');

  useEffect(() => {
    biometricStatus().then(setBio);
  }, [config.enabled]);

  const noun = config.kind === 'pin' ? 'PIN' : 'password';

  async function turnOnBiometrics() {
    const outcome = await promptBiometric('Confirm to turn on biometric unlock');
    if (outcome === 'success') {
      await setBiometrics(true);
      await refresh();
    } else if (outcome !== 'cancelled') {
      Alert.alert("Couldn't verify", 'Biometric unlock was not turned on.');
    }
  }

  async function finish(mode: FlowMode, secret?: string) {
    if (mode === 'verify' && secret) await disableLock(secret);
    await refresh();

    if (mode === 'create' && bio === 'ready') {
      const kind = useLockStore.getState().config.kind === 'pin' ? 'PIN' : 'password';
      Alert.alert(
        'Unlock with biometrics?',
        `Use your fingerprint or face instead of typing your ${kind}. Your ${kind} will always still work.`,
        [{ text: 'Not now', style: 'cancel' }, { text: 'Turn on', onPress: turnOnBiometrics }]
      );
    }
  }

  const currentLabel = TIMEOUT_OPTIONS.find((o) => o.seconds === config.timeoutSec)?.label ?? TIMEOUT_LABELS[1];

  return (
    <>
      <View style={styles.row}>
        <View style={styles.gutter}>
          <Ionicons name="lock-closed-outline" size={18} color={ACCENT} />
        </View>
        <View style={styles.text}>
          <Text style={styles.label}>App lock</Text>
          <Text style={styles.hint}>Ask for a PIN or password to open the app</Text>
        </View>
        <Switch
          value={config.enabled}
          onValueChange={(on) => setFlow(on ? 'create' : 'verify')}
          trackColor={{ false: '#E5E3F0', true: ACCENT }}
          thumbColor="#FFFFFF"
        />
      </View>
      <Divider />

      {config.enabled && (
        <>
          <View style={styles.row}>
            <View style={styles.gutter}>
              <Ionicons name="time-outline" size={18} color={ACCENT} />
            </View>
            <Text style={[styles.label, styles.text]}>Lock</Text>
            <DropdownPicker
              label="Lock the app"
              options={TIMEOUT_LABELS}
              selected={currentLabel}
              onSelect={async (label) => {
                const seconds = TIMEOUT_OPTIONS.find((o) => o.label === label)?.seconds;
                if (seconds !== undefined) {
                  await setTimeoutSec(seconds);
                  await refresh();
                }
              }}
              triggerTextStyle={{ fontStyle: 'normal', color: '#07022A' }}
              iconColor="#666"
            />
          </View>
          <Divider />

          <View style={styles.row}>
            <View style={styles.gutter}>
              <Ionicons name="finger-print-outline" size={18} color={ACCENT} />
            </View>
            <View style={styles.text}>
              <Text style={styles.label}>Unlock with biometrics</Text>
              <Text style={styles.hint}>{BIO_HINT[bio]}</Text>
            </View>
            <Switch
              value={config.biometrics}
              disabled={bio !== 'ready' && !config.biometrics}
              onValueChange={async (on) => {
                if (on) {
                  await turnOnBiometrics();
                } else {
                  await setBiometrics(false);
                  await refresh();
                }
              }}
              trackColor={{ false: '#E5E3F0', true: ACCENT }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Divider />

          <Pressable style={styles.row} onPress={() => setFlow('change')}>
            <View style={styles.gutter}>
              <Ionicons name="key-outline" size={18} color={ACCENT} />
            </View>
            <Text style={[styles.label, styles.text]}>Change PIN or password</Text>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </Pressable>
          <Divider />
        </>
      )}

      <SecretFlowModal
        visible={flow !== null}
        mode={flow ?? 'create'}
        currentKind={config.kind}
        onClose={() => setFlow(null)}
        onDone={(secret) => {
          if (flow) finish(flow, secret);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  gutter: { width: ROW_GUTTER, alignItems: 'flex-start' },
  text: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#07022A' },
  hint: { fontSize: 12, marginTop: 2, color: '#666' },
  divider: { height: 1, width: '85%', alignSelf: 'center', backgroundColor: '#E5E3F0' },
});