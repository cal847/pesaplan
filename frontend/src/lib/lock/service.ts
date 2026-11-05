/**
 * This file handles lock/unlock logic, including creating and verifying the secret, tracking failed attempts, and enforcing timeouts.
 */
import * as Crypto from 'expo-crypto';

import {
  checkSecret,
  DEFAULT_TIMEOUT_SECONDS,
  lockoutSeconds,
  MAX_LOCKOUT_SECONDS,
  SecretKind,
  TIMEOUT_OPTIONS,
  triesBeforeLockout,
} from './rules';
import { clearRecord, LockRecord, readRecord, writeRecord } from './storage';

export type LockConfig = { enabled: boolean; kind: SecretKind; timeoutSec: number; biometrics: boolean };

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'wrong'; triesLeft: number }
  | { ok: false; reason: 'locked'; secondsLeft: number }
  | { ok: false; reason: 'not_set' };

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const hash = (secret: string, salt: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${secret}`);

// compares every character, so a mismatch near the start isn't faster than one near the end
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function waitSeconds(rec: LockRecord, now: number): number {
  // capped, so a clock set far back can't lock someone out for days
  const ms = Math.min(rec.lockedUntil - now, MAX_LOCKOUT_SECONDS * 1000);
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

export async function getConfig(): Promise<LockConfig> {
  const rec = await readRecord();
  return rec
    ? { enabled: true, kind: rec.kind, timeoutSec: rec.timeoutSec, biometrics: rec.biometrics }
    : { enabled: false, kind: 'pin', timeoutSec: DEFAULT_TIMEOUT_SECONDS, biometrics: false };
}

/**
 * Sets or replaces the secret, keeping the other settings. When replacing, the caller
 * must have verified the old one first.
 */
export async function createSecret(kind: SecretKind, secret: string): Promise<'ok' | 'invalid' | 'weak'> {
  const check = checkSecret(kind, secret);
  if (check !== 'ok') return check;

  const prev = await readRecord();
  const salt = toHex(Crypto.getRandomBytes(16));
  await writeRecord({
    kind,
    salt,
    hash: await hash(secret, salt),
    timeoutSec: prev?.timeoutSec ?? DEFAULT_TIMEOUT_SECONDS,
    biometrics: prev?.biometrics ?? false,
    failed: 0,
    lockedUntil: 0,
  });
  return 'ok';
}

export async function verifySecret(secret: string, now = Date.now()): Promise<VerifyResult> {
  const rec = await readRecord();
  if (!rec) return { ok: false, reason: 'not_set' };

  const wait = waitSeconds(rec, now);
  if (wait > 0) return { ok: false, reason: 'locked', secondsLeft: wait };

  const matches =
    checkSecret(rec.kind, secret) !== 'invalid' && safeEqual(await hash(secret, rec.salt), rec.hash);

  if (matches) {
    if (rec.failed || rec.lockedUntil) await writeRecord({ ...rec, failed: 0, lockedUntil: 0 });
    return { ok: true };
  }

  const failed = rec.failed + 1;
  const lockFor = lockoutSeconds(failed);
  await writeRecord({ ...rec, failed, lockedUntil: lockFor > 0 ? now + lockFor * 1000 : 0 });

  return lockFor > 0
    ? { ok: false, reason: 'locked', secondsLeft: lockFor }
    : { ok: false, reason: 'wrong', triesLeft: triesBeforeLockout(failed) };
}

/** Turns the lock off, but only for someone who knows the secret. */
export async function disableLock(secret: string, now = Date.now()): Promise<VerifyResult> {
  const result = await verifySecret(secret, now);
  if (result.ok) await clearRecord();
  return result;
}

export async function lockoutRemaining(now = Date.now()): Promise<number> {
  const rec = await readRecord();
  return rec ? waitSeconds(rec, now) : 0;
}

export async function setTimeoutSec(seconds: number): Promise<void> {
  if (!TIMEOUT_OPTIONS.some((o) => o.seconds === seconds)) return;
  const rec = await readRecord();
  if (rec) await writeRecord({ ...rec, timeoutSec: seconds });
}

export async function setBiometrics(enabled: boolean): Promise<void> {
  const rec = await readRecord();
  if (rec) await writeRecord({ ...rec, biometrics: enabled });
}

/** A successful biometric unlock also clears the failed-attempt count. */
export async function recordBiometricSuccess(): Promise<void> {
  const rec = await readRecord();
  if (rec && (rec.failed || rec.lockedUntil)) await writeRecord({ ...rec, failed: 0, lockedUntil: 0 });
}