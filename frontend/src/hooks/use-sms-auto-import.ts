import { useEffect } from 'react';
import { AppState } from 'react-native';

import { runSmsImport } from '@/lib/sms/auto-import';
import { useLockStore } from '@/stores/lock-store';

/** Scans the inbox once the app is unlocked, and again whenever it comes back to the foreground. */
export function useSmsAutoImport() {
  const status = useLockStore((s) => s.status);

  useEffect(() => {
    if (status !== 'unlocked') return;
    runSmsImport();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') runSmsImport();
    });
    return () => sub.remove();
  }, [status]);
}