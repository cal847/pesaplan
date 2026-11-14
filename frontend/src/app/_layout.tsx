
import { useFonts } from 'expo-font';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import './debug-appearance';

import { APP_FONT_ASSETS } from '@/components/app-text';
import { LockGate } from '@/components/lock/lock-gate';
import { runSmsImport } from '@/lib/sms/auto-import';
import { useSettingsStore } from '@/stores/settings-store';

// Keep native splash visible while the app loads.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load all application fonts in one place.
  const [fontsLoaded] = useFonts(APP_FONT_ASSETS);

  const colorScheme = useColorScheme();

  const themePreference = useSettingsStore(
    (s) => s.themePreference
  );

  // Apply the user's theme preference.
  useEffect(() => {
    Appearance.setColorScheme(
      themePreference === 'light' || themePreference === 'dark'
        ? themePreference
        : 'unspecified'
    );
  }, [themePreference]);

  // Run SMS import when the application boots.
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await runSmsImport({ force: false });

      if (cancelled) return;
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  // Hide splash only after fonts are loaded.
  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <LockGate>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />

          <Stack.Screen
            name="(tabs)"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />

          <Stack.Screen name="all-subscriptions" />
          <Stack.Screen name="all-transactions" />
        </Stack>
      </LockGate>
    </ThemeProvider>
  );
}
