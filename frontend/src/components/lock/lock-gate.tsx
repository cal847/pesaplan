import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { PAGE_BACKGROUND } from '@/constants/colors';
import { useLockStore } from '@/stores/lock-store';

import { UnlockScreen } from './unlock-screen';

function Cover() {
  return (
    <View style={styles.cover}>
      <Ionicons name="wallet" size={44} color="#3F2FD6" />
    </View>
  );
}

export function LockGate({ children }: { children: ReactNode }) {
  const status = useLockStore((s) => s.status);
  const enabled = useLockStore((s) => s.config.enabled);
  const [away, setAway] = useState(false);

  useEffect(() => {
    useLockStore.getState().init();

    const sub = AppState.addEventListener('change', (next) => {
      const { onBackground, onForeground } = useLockStore.getState();
      setAway(next !== 'active'); // "inactive" on iOS is when the app switcher takes its snapshot
      if (next === 'background') onBackground();
      if (next === 'active') onForeground();
    });
    return () => sub.remove();
  }, []);

  const locked = status === 'locked';

  return (
    <View style={styles.fill}>
      {/* a locked app is hidden from screen readers too, not only covered */}
      <View
        style={styles.fill}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={locked}>
        {children}
      </View>

      {locked && <UnlockScreen />}
      {!locked && (status === 'loading' || (enabled && away)) && <Cover />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PAGE_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});