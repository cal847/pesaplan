/**
 * Holds the messages shown during lock/unlock operations.
 */
import { formatWait, SecretCheck, SecretKind } from './rules';
import type { VerifyResult } from './service';

const noun = (kind: SecretKind) => (kind === 'pin' ? 'PIN' : 'password');

export function describeFailure(result: Extract<VerifyResult, { ok: false }>, kind: SecretKind): string {
  switch (result.reason) {
    case 'wrong':
      return `Wrong ${noun(kind)}. ${result.triesLeft} ${result.triesLeft === 1 ? 'try' : 'tries'} left before a lockout.`;
    case 'locked':
      return `Too many attempts. Try again in ${formatWait(result.secondsLeft)}.`;
    case 'not_set':
      return 'No lock is set up.';
  }
}

export function explainCheck(kind: SecretKind, check: Exclude<SecretCheck, 'ok'>): string {
  if (kind === 'pin') {
    return check === 'weak'
      ? 'Weak PIN. Avoid repeats and runs like 123456.'
      : 'Enter exactly 6 digits.';
  }
  return check === 'weak'
    ? 'Weak password. Try something longer or less common.'
    : 'Use 8 to 64 characters.';
}