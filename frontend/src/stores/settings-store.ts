import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SpendingPeriod } from '@/lib/period';

export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsStore = {
  themePreference: ThemePreference;
  lockEnabled: boolean;
  spendingLimitCents: number | null;
  spendingPeriod: SpendingPeriod;
  setSpendingLimitCents: (value: number | null) => void;
  setSpendingPeriod: (value: SpendingPeriod) => void;
  setThemePreference: (value: ThemePreference) => void;
  setLockEnabled: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themePreference: 'system',
      lockEnabled: false,
      spendingLimitCents: null,
      spendingPeriod: 'Monthly',
      setSpendingLimitCents: (spendingLimitCents) => set({ spendingLimitCents }),
      setSpendingPeriod: (spendingPeriod) => set({ spendingPeriod }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
    }),
    { name: 'pesaplan-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);