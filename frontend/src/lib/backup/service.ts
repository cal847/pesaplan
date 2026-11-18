// frontend/src/lib/backup/service.ts
import { getDb } from '@/lib/db/database';
import { useDataStore } from '@/stores/data-store';
import { useSettingsStore } from '@/stores/settings-store';

import { deleteFile, downloadBackup, listBackups, TokenSource, uploadBackup } from './drive';
import { backupFileName, backupsToPrune, CancelToken } from './drive-helpers';
import { BackupError, toBackupError } from './errors';
import { BackupData, BackupSettings, parseBackup, serializeBackup } from './format';
import { pickGoogleAccount, refreshGoogleToken } from './google-auth';
import { readTables, schemaVersion, writeTables } from './snapshot';

export type BackupStep = 'signing_in' | 'collecting' | 'uploading' | 'tidying' | 'done';
export type RestoreStep = 'signing_in' | 'finding' | 'downloading' | 'restoring' | 'done';
export type Progress<S> = { step: S; percent: number; email: string | null };

export type BackupResult = { at: number; email: string | null; transactions: number; budgetItems: number; sizeBytes: number };
export type RestoreResult = { backupAt: number; email: string | null; transactions: number; budgetItems: number };

let busy = false;

const activity = { restoring: false }

function tokenSource(initial: string): TokenSource {
  let current = initial;
  return {
    get: async () => current,
    refresh: async () => (current = await refreshGoogleToken(current)),
  };
}

function readSettings(): BackupSettings {
  const s = useSettingsStore.getState();
  return { themePreference: s.themePreference, spendingLimitCents: s.spendingLimitCents, spendingPeriod: s.spendingPeriod };
}

const throwIfCancelled = (cancel: CancelToken) => {
  if (cancel.cancelled) throw new BackupError('Cancelled', 'cancelled');
};

export async function runBackup(
  onProgress: (p: Progress<BackupStep>) => void,
  cancel: CancelToken
): Promise<BackupResult> {
  if (busy) throw new BackupError('A backup or restore is already running.', 'unknown');
  busy = true;
  try {
    onProgress({ step: 'signing_in', percent: 2, email: null });
    const session = await pickGoogleAccount(); // Google's account picker appears here
    const { email } = session;
    const tokens = tokenSource(session.accessToken);
    throwIfCancelled(cancel);

    onProgress({ step: 'collecting', percent: 10, email });
    const db = await getDb();
    const tables = await readTables(db, (f) => onProgress({ step: 'collecting', percent: 10 + f * 15, email }));
    const data: BackupData = { ...tables, settings: readSettings() };
    const text = await serializeBackup(data, await schemaVersion(db));
    throwIfCancelled(cancel);

    onProgress({ step: 'uploading', percent: 30, email });
    await uploadBackup(
      tokens, backupFileName(), text,
      (f) => onProgress({ step: 'uploading', percent: 30 + f * 60, email }),
      cancel
    );

    onProgress({ step: 'tidying', percent: 92, email });
    try {
      for (const old of backupsToPrune(await listBackups(tokens))) await deleteFile(tokens, old.id);
    } catch {
      /* an extra old backup left behind is harmless */
    }

    const at = Date.now();
    useSettingsStore.getState().setLastBackup(at, email);
    onProgress({ step: 'done', percent: 100, email });
    return { at, email, transactions: data.transactions.length, budgetItems: data.budgetItems.length, sizeBytes: text.length };
  } catch (e) {
    throw toBackupError(e);
  } finally {
    busy = false;
  }
}

export async function runRestore(
  onProgress: (p: Progress<RestoreStep>) => void,
  cancel: CancelToken
): Promise<RestoreResult> {
  if (busy) throw new BackupError('A backup or restore is already running.', 'unknown');
  busy = true;
  try {
    onProgress({ step: 'signing_in', percent: 2, email: null });
    const session = await pickGoogleAccount();
    const { email } = session;
    const tokens = tokenSource(session.accessToken);
    throwIfCancelled(cancel);

    onProgress({ step: 'finding', percent: 10, email });
    const newest = (await listBackups(tokens))[0];
    if (!newest) throw new BackupError('There is no PesaBudge backup in this Google account.', 'not_found');
    throwIfCancelled(cancel);

    onProgress({ step: 'downloading', percent: 25, email });
    const text = await downloadBackup(tokens, newest.id);
    const db = await getDb();
    const parsed = await parseBackup(text, await schemaVersion(db));
    if (!parsed.ok) {
      throw parsed.reason === 'too_new'
        ? new BackupError('This backup was made by a newer version of PesaBudge. Update the app and try again.', 'too_new')
        : new BackupError(
            parsed.reason === 'corrupt' ? 'The backup file is damaged, so it cannot be restored.' : "That file isn't a valid PesaBudge backup.",
            'invalid_backup'
          );
    }
    throwIfCancelled(cancel); // the last point where stopping is possible

    const { data, createdAt } = parsed.file;
    onProgress({ step: 'restoring', percent: 45, email });
    activity.restoring = true;
    try {
      await writeTables(db, data, (f) => onProgress({ step: 'restoring', percent: 45 + f * 50, email }));
    } finally {
      activity.restoring = false;
    }

    const store = useSettingsStore.getState();
    store.setThemePreference(data.settings.themePreference);
    store.setSpendingLimitCents(data.settings.spendingLimitCents);
    store.setSpendingPeriod(data.settings.spendingPeriod);
    store.setActiveSim(null);
    store.setSmsScannedUntil(0); // so the next inbox scan re-reads the messages on this phone
    store.setLastBackup(createdAt, email);
    useDataStore.getState().bump();

    onProgress({ step: 'done', percent: 100, email });
    return { backupAt: createdAt, email, transactions: data.transactions.length, budgetItems: data.budgetItems.length };
  } catch (e) {
    throw toBackupError(e);
  } finally {
    busy = false;
  }
}