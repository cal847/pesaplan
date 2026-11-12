/**
 * Scans the inbox fornew M-Pesa messages. `force` rescans everything. Safe to call often.
 */

import { Alert, PermissionsAndroid, Platform, ToastAndroid } from 'react-native';

import { getDb } from '@/lib/db/database';
import { upsertSims } from '@/lib/db/sims';
import { saveParsedMany } from '@/lib/db/transactions';
import { useDataStore } from '@/stores/data-store';
import { useSettingsStore } from '@/stores/settings-store';

import { readInbox, smsInboxAvailable } from '../../../modules/sms-reader';
import { toCandidates } from './inbox';

const DAY = 86_400_000;
const BATCH = 1000;

let running = false;
let lastRun = 0;

export async function ensurePermission(): Promise<boolean> {
  const permission = PermissionsAndroid.PERMISSIONS.READ_SMS;
  if (await PermissionsAndroid.check(permission)) return true;

  // ask once. After that the Permissions row in Profile is the way back, so we don't nag.
  const { smsPromptShown, setSmsPromptShown } = useSettingsStore.getState();
  if (smsPromptShown) return false;
  setSmsPromptShown(true);

  const proceed = await new Promise<boolean>((resolve) =>
    Alert.alert(
      'Import M-Pesa messages?',
      'PesaPlan can read the M-Pesa messages on this phone to record your transactions automatically. Only messages from M-PESA are used, and the messages themselves are not stored or sent anywhere.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: false }
    )
  );
  if (!proceed) return false;
  return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
}

async function scan(sinceMs: number) {
  const db = await getDb();
  const total = { saved: 0, duplicates: 0, unreadable: 0, newest: 0 };
  let since = sinceMs;
  let afterId = 0;

  for (let round = 0; round < 50; round++) {
    const rows = await readInbox(since, afterId, BATCH);
    if (rows.length === 0) break;

    const { candidates, sims, unreadable, newest } = toCandidates(rows);
    await upsertSims(db, sims);
    const { saved, duplicates } = await saveParsedMany(db, candidates);

    total.saved += saved;
    total.duplicates += duplicates;
    total.unreadable += unreadable;
    total.newest = Math.max(total.newest, newest);

    if (rows.length < BATCH || newest <= since) break; // reached the end
    since = newest;
    afterId = newest;
  }
  return total;
}

/** Scans the inbox for new M-Pesa messages. `force` rescans everything. Safe to call often. */
export async function runSmsImport({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (Platform.OS !== 'android' || !smsInboxAvailable || running) return;
  if (!force && Date.now() - lastRun < 60_000) return;

  running = true;
  try {
    if (!(await ensurePermission())) return;

    const settings = useSettingsStore.getState();
    const since = force ? 0 : Math.max(0, settings.smsScannedUntil - DAY); // 24h overlap, see above
    const result = await scan(since);

    // saved only after the database write succeeded, so a crash can't lose messages
    settings.setSmsScannedUntil(Math.max(settings.smsScannedUntil, result.newest));
    lastRun = Date.now();

    if (result.saved > 0) {
      useDataStore.getState().bump();
      ToastAndroid.show(
        `Imported ${result.saved} new transaction${result.saved === 1 ? '' : 's'}`,
        ToastAndroid.SHORT
      );
    } else if (force) {
      ToastAndroid.show('No new transactions found', ToastAndroid.SHORT);
    }
  } catch (e) {
    console.warn('sms import failed', e);
  } finally {
    running = false;
  }
}