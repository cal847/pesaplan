import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-mono';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import './debug-appearance';

import { LockGate } from '@/components/lock/lock-gate';
import { runSmsImport } from '@/lib/sms/auto-import';
import { useSettingsStore } from '@/stores/settings-store';

// keeps the native splash up until the splash route says it's ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  // system hands control back to the OS by passing null
  useEffect(() => {
    Appearance.setColorScheme(
      themePreference === 'light' || themePreference === 'dark'
        ? themePreference
        : 'unspecified'
    );
  }, [themePreference]);

  const [fontsLoaded] = useFonts({
      IBMPlexMono_400Regular,
      IBMPlexMono_500Medium,
      IBMPlexMono_600SemiBold,
    });

    if (!fontsLoaded) {
      return null;
    }
    
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LockGate>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {/* no swipe-back into the splash, and a fade into the app */}
          <Stack.Screen name="index" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="all-subscriptions" />
          <Stack.Screen name="all-transactions" />
        </Stack>
      </LockGate>
    </ThemeProvider>
  );
}