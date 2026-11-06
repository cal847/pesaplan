import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SpendingPeriod } from '@/lib/period';

export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsStore = {
  themePreference: ThemePreference;
  spendingLimitCents: number | null;
  spendingPeriod: SpendingPeriod;
  setSpendingLimitCents: (value: number | null) => void;
  setSpendingPeriod: (value: SpendingPeriod) => void;
  setThemePreference: (value: ThemePreference) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themePreference: 'system',
      spendingLimitCents: null,
      spendingPeriod: 'Monthly',
      setSpendingLimitCents: (spendingLimitCents) => set({ spendingLimitCents }),
      setSpendingPeriod: (spendingPeriod) => set({ spendingPeriod }),
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    { name: 'pesaplan-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);