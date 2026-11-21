/** 
 * This file holds the logic for reading/writing the lock record(timeout, failed attempts, etc.) to secure storage. It does not handle the actual lock/unlock logic.
 * The record is stored in a single JSON blob, and is encrypted by the OS. It is not readable by other apps or the user.
 * The record is not readable by the app if the device is locked, so it should only be read when the app is in the foreground.
 */
import * as SecureStore from 'expo-secure-store';

import type { SecretKind } from './rules';

const KEY = 'pesabudge.lock.v1';
// "this device only" keeps the entry out of device-to-device migrations on iOS
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export type LockRecord = {
  kind: SecretKind;
  salt: string;
  hash: string;
  timeoutSec: number;
  biometrics: boolean;
  failed: number;
  lockedUntil: number;
};

function isRecord(v: any): v is LockRecord {
  return (
    v &&
    (v.kind === 'pin' || v.kind === 'password') &&
    typeof v.salt === 'string' &&
    typeof v.hash === 'string' &&
    typeof v.timeoutSec === 'number' &&
    typeof v.biometrics === 'boolean' &&
    typeof v.failed === 'number' &&
    typeof v.lockedUntil === 'number'
  );
}

/** null means "no lock". An unreadable record is treated the same way, because it can't be verified anyway. */
export async function readRecord(): Promise<LockRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch (e) {
    console.warn('lock record unreadable, treating the lock as off', e);
    return null;
  }
}

export async function writeRecord(record: LockRecord): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(record), OPTIONS);
}

export async function clearRecord(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY, OPTIONS);
}