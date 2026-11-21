/**
 * Handles errors that may arise during uploads
 */
import { DriveError } from './drive-helpers';

export type BackupErrorKind =
  | 'cancelled' | 'auth' | 'config' | 'quota' | 'network'
  | 'not_found' | 'invalid_backup' | 'too_new' | 'unknown';

export class BackupError extends Error {
  constructor(message: string, readonly kind: BackupErrorKind) {
    super(message);
  }
}

export function toBackupError(e: unknown): BackupError {
  if (e instanceof BackupError) return e;
  if (e instanceof DriveError) {
    const kind: BackupErrorKind = e.kind === 'server' ? 'network' : e.kind;
    return new BackupError(e.message, kind);
  }
  const text = String((e as { message?: string })?.message ?? e);
  if (/DEVELOPER_ERROR/.test(text)) {
    return new BackupError("Google sign-in isn't set up correctly in this build.", 'config');
  }
  if (/NETWORK_ERROR/i.test(text)) {
    return new BackupError('Could not reach Google. Check your connection.', 'network');
  }
  console.warn('backup failed', e);
  return new BackupError('Something went wrong. Please try again.', 'unknown');
}