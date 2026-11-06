import * as LocalAuthentication from 'expo-local-authentication';
// import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import type { PermissionId, PermissionInfo } from '@/lib/permissions';


const Notifications = Platform.OS === 'android' || Platform.OS === 'ios' ? require('expo-notifications') : null;

async function readSms(): Promise<PermissionInfo> {
  // Skip iPhones since they don't allow reading sms inbox
  if (Platform.OS !== 'android') return { id: 'sms', state: 'unavailable', canAskAgain: false };
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  return { id: 'sms', state: granted ? 'granted' : 'denied', canAskAgain: false };
}

async function readNotifications(): Promise<PermissionInfo> {
  const p = await Notifications?.getPermissionsAsync();
  const state = p?.granted ? 'granted' : String(p?.status) === 'undetermined' ? 'undetermined' : 'denied';
  return { id: 'notifications', state, canAskAgain: p?.canAskAgain };
}

async function readBiometrics(): Promise<PermissionInfo> {
  if (!(await LocalAuthentication.hasHardwareAsync())) {
    return { id: 'biometrics', state: 'unavailable', canAskAgain: false };
  }
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return { id: 'biometrics', state: enrolled ? 'granted' : 'denied', canAskAgain: false };
}

// one failing check shouldn't blank the whole list
async function safe(id: PermissionId, read: () => Promise<PermissionInfo>): Promise<PermissionInfo> {
  try {
    return await read();
  } catch (e) {
    console.warn(`permission check failed: ${id}`, e);
    return { id, state: 'unavailable', canAskAgain: false };
  }
}

/** `items` is null until the first check finishes. It refreshes when the app returns to the foreground. */
export function usePermissions() {
  const [items, setItems] = useState<PermissionInfo[] | null>(null);

  const refresh = useCallback(async () => {
    setItems(
      await Promise.all([
        safe('sms', readSms),
        safe('notifications', readNotifications),
        safe('biometrics', readBiometrics),
      ])
    );
  }, []);

  useEffect(() => {
    refresh();
    // someone may change a permission in system settings and come back
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(
    async (id: PermissionId) => {
      if (id === 'notifications') await Notifications?.requestPermissionsAsync();
      await refresh();
    },
    [refresh]
  );

  return { items, request };
}