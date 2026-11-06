import type { SecretKind } from '@/lib/lock/rules';

import { PasswordForm } from './password-form';
import { InputProps, PinPad } from './pin-pad';

export function SecretInput({ kind, ...props }: { kind: SecretKind } & InputProps) {
  return kind === 'pin' ? <PinPad {...props} /> : <PasswordForm {...props} />;
}