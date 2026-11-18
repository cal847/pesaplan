/**
 * Defines lock state and how to manipulate it during backgrounding/foregrounding. 
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { shouldLock } from '@/lib/lock/rules';
import { getConfig, LockConfig } from '@/lib/lock/service';
import { clearRecord } from '@/lib/lock/storage';

const INSTALL_MARKER = 'pesabudge.installed';
const OFF: LockConfig = { enabled: false, kind: 'pin', timeoutSec: 60, biometrics: false };

// not React state, because nothing renders from it
let backgroundedAt: number | null = null;

type Status = 'loading' | 'locked' | 'unlocked';

type LockStore = {
  status: Status;
  config: LockConfig;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  unlock: () => void;
  reset: () => void;
  onBackground: () => void;
  onForeground: () => void;
};

export const useLockStore = create<LockStore>((set, get) => ({
  status: 'loading',
  config: OFF,

  init: async () => {
    try {
      // Prevents asking for PIN/biometric on a fresh installation.
      if (!(await AsyncStorage.getItem(INSTALL_MARKER))) {
        await clearRecord();
        await AsyncStorage.setItem(INSTALL_MARKER, '1');
      }
      const config = await getConfig();
      set({ config, status: config.enabled ? 'locked' : 'unlocked' });
    } catch (e) {
      // failing open is the lesser evil: failing closed would lock someone out of their own data
      console.warn('lock init failed', e);
      set({ config: OFF, status: 'unlocked' });
    }
  },

  refresh: async () => set({ config: await getConfig() }),

  // Clears backgroundedAt timestamp to prevent immediate rr-locking when the app is foregrounded.
  unlock: () => {
    backgroundedAt = null;
    set({ status: 'unlocked' });
  },

  reset: () => {
    backgroundedAt = null;
    set({ config: OFF, status: 'unlocked' });
  },

  onBackground: () => {
    backgroundedAt = Date.now();
  },

  onForeground: () => {
    const left = backgroundedAt;
    backgroundedAt = null;
    const { status, config } = get();
    if (status === 'unlocked' && config.enabled && shouldLock(left, Date.now(), config.timeoutSec)) {
      set({ status: 'locked' });
    }
  },
}));