/** Handles communication with Google Drive API
 * Handles errors
 * Formats files into readable pesaplan-backup- for easier lookup
 * Sends a multipart request
 * Cleans up past backups, except the most recent 'keep' value
 */

export type DriveFile = { id: string; name: string; size: number; createdTime: string };

export type DriveErrorKind = 'auth' | 'quota' | 'network' | 'server' | 'cancelled' | 'not_found' | 'unknown';

export class DriveError extends Error {
  constructor(message: string, readonly kind: DriveErrorKind, readonly status?: number) {
    super(message);
  }
}

export class CancelToken {
  cancelled = false;
  private hooks: Array<() => void> = [];
  onCancel(fn: () => void) {
    this.hooks.push(fn);
  }
  cancel() {
    this.cancelled = true;
    this.hooks.forEach((h) => h());
  }
}

export const BACKUP_PREFIX = 'pesaplan-backup-';

export const backupFileName = (now = new Date()) =>
  `${BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}.json`;

export const query = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

/** The body of a Drive multipart upload: the file's details, then its content. */
export function multipartBody(meta: object, content: string, boundary: string): string {
  return (
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n` +
    `--${boundary}--`
  );
}

export function mapDriveError(status: number, bodyText: string): DriveError {
  let reason = '';
  try {
    const err = JSON.parse(bodyText)?.error;
    reason = String(err?.errors?.[0]?.reason ?? err?.status ?? '');
  } catch {
    /* not JSON */
  }

  if (status === 401) return new DriveError('Google no longer accepts this sign-in.', 'auth', status);
  if (status === 403) {
    if (/storageQuotaExceeded|quotaExceeded/i.test(reason)) {
      return new DriveError('Your Google Drive is full.', 'quota', status);
    }
    if (/rateLimit/i.test(reason)) return new DriveError('Google is busy. Try again in a moment.', 'server', status);
    return new DriveError("Google didn't allow access to Drive for this account.", 'auth', status);
  }
  if (status === 404) return new DriveError('That backup could not be found.', 'not_found', status);
  if (status === 429 || status >= 500) return new DriveError('Google is busy. Try again in a moment.', 'server', status);
  return new DriveError('Google rejected the request.', 'unknown', status);
}

/** Delete all backups except the latest 'keep' value. */
export function backupsToPrune(files: DriveFile[], keep = 3): DriveFile[] {
  return [...files].sort((a, b) => b.createdTime.localeCompare(a.createdTime)).slice(keep);
}