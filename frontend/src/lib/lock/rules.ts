export type SecretKind = 'pin' | 'password';

export const PIN_LENGTH = 6;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const MAX_LOCKOUT_SECONDS = 3600;
const FREE_TRIES = 5;
const BASE_LOCKOUT_SECONDS = 30;

export const TIMEOUT_OPTIONS = [
  { label: 'Immediately', seconds: 0 },
  { label: 'After 1 minute', seconds: 60 },
  { label: 'After 5 minutes', seconds: 300 },
] as const;
export const DEFAULT_TIMEOUT_SECONDS = 60;

const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', '123456789', '1234567890',
  'qwertyui', 'qwertyuiop', 'abcd1234', 'iloveyou', '11111111',
]);

export type SecretCheck = 'ok' | 'invalid' | 'weak';

export function checkSecret(kind: SecretKind, secret: string): SecretCheck {
  if (kind === 'pin') {
    if (!/^\d{6}$/.test(secret)) return 'invalid';
    const d = [...secret].map(Number);
    if (d.every((n) => n === d[0])) return 'weak'; // 000000
    const step = d[1] - d[0];

    // Check for sequential numbers, either ascending or descending
    if ((step === 1 || step === -1) && d.every((n, i) => i === 0 || n - d[i - 1] === step)) {
      return 'weak'; // 123456, 654321
    }
    return 'ok';
  }
  if (secret.length < PASSWORD_MIN || secret.length > PASSWORD_MAX) return 'invalid';
  if (secret.trim().length === 0) return 'invalid';
  if (/^(.)\1+$/.test(secret) || COMMON_PASSWORDS.has(secret.toLowerCase())) return 'weak';
  return 'ok';
}

/** Every fifth miss triggers a wait that doubles each time: 30s, 60s, 120s... capped at an hour. */
export function lockoutSeconds(failed: number): number {
  if (failed < FREE_TRIES || failed % FREE_TRIES !== 0) return 0;
  return Math.min(MAX_LOCKOUT_SECONDS, BASE_LOCKOUT_SECONDS * 2 ** (failed / FREE_TRIES - 1));
}

export const triesBeforeLockout = (failed: number) => FREE_TRIES - (failed % FREE_TRIES);

/** Should the app lock on return? A clock set backwards counts as "too long". */
export function shouldLock(backgroundedAt: number | null, now: number, timeoutSec: number): boolean {
  if (backgroundedAt === null) return false;
  const elapsed = now - backgroundedAt;
  return elapsed < 0 || elapsed >= timeoutSec * 1000;
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}