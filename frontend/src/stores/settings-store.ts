import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsStore = {
  themePreference: ThemePreference;
  lockEnabled: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setLockEnabled: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themePreference: 'system',
      lockEnabled: false,
      setThemePreference: (themePreference) => set({ themePreference }),
      setLockEnabled: (lockEnabled) => set({ lockEnabled }),
    }),
    { name: 'pesaplan-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);