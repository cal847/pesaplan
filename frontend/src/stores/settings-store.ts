import type { SpendingPeriod } from '@/lib/period';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsStore = {
  themePreference: ThemePreference;
  spendingLimitCents: number | null;
  spendingPeriod: SpendingPeriod;
  setSpendingLimitCents: (value: number | null) => void;
  setSpendingPeriod: (value: SpendingPeriod) => void;
  setThemePreference: (value: ThemePreference) => void;
  smsScannedUntil: number;                    // epoch ms of the newest message already handled
  smsPromptShown: boolean;
  activeSim: string | null;                   // null means all SIMs
  setSmsScannedUntil: (v: number) => void;
  setSmsPromptShown: (v: boolean) => void;
  setActiveSim: (v: string | null) => void;
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
      smsScannedUntil: 0,
      smsPromptShown: false,
      activeSim: null,
      setSmsScannedUntil: (smsScannedUntil) => set({ smsScannedUntil }),
      setSmsPromptShown: (smsPromptShown) => set({ smsPromptShown }),
      setActiveSim: (activeSim) => set({ activeSim }),
    }),
    { name: 'pesaplan-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);