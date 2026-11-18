/**
 * Scans the inbox for new M-Pesa messages. `force` rescans everything. Safe to call often.
 */

import { Alert, PermissionsAndroid, Platform, ToastAndroid } from 'react-native';

import { getDb } from '@/lib/db/database';
import { upsertSims } from '@/lib/db/sims';
import { saveParsedMany } from '@/lib/db/transactions';
import { useDataStore } from '@/stores/data-store';
import { useSettingsStore } from '@/stores/settings-store';

import { readInbox, smsInboxAvailable } from '../../../modules/sms-reader';
import { toCandidates } from './inbox';

const activity = { restoring: false };

const DAY = 86_400_000;
const BATCH = 1000;

let running = false;
let lastRun = 0;

type SmsPermissionResult =
  | typeof PermissionsAndroid.RESULTS.GRANTED
  | typeof PermissionsAndroid.RESULTS.DENIED
  | typeof PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  | 'cancelled';

export async function ensurePermission(
  { manualRetry = false }: { manualRetry?: boolean } = {}
): Promise<SmsPermissionResult> {
  const permission = PermissionsAndroid.PERMISSIONS.READ_SMS;

  if (await PermissionsAndroid.check(permission)) {
    return PermissionsAndroid.RESULTS.GRANTED;
  }

  const { smsPromptShown, setSmsPromptShown } = useSettingsStore.getState();

  if (smsPromptShown && !manualRetry) {
    return PermissionsAndroid.RESULTS.DENIED;
  }

  if (!smsPromptShown) {
    setSmsPromptShown(true);
  }

  if (!manualRetry) {
    const proceed = await new Promise<boolean>((resolve) =>
      Alert.alert(
        'Import M-Pesa messages?',
        'PesaBudge can read the M-Pesa messages on this phone to record your transactions automatically. Only messages from M-PESA are used, and the messages themselves are not stored or sent anywhere.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
        { cancelable: false }
      )
    );

    if (!proceed) return 'cancelled';
  }

  return PermissionsAndroid.request(permission, {
    title: 'Allow SMS access',
    message: 'PesaBudge reads M-Pesa messages to import transactions automatically.',
    buttonPositive: 'Continue',
    buttonNegative: 'Not now',
  });
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
    const parsedItems = candidates.map(({ parsed, simKey }) => ({
      ...parsed,
      simKey,
    }));

    const { saved, duplicates } = await saveParsedMany(db, parsedItems);

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
  console.log('runSmsImport called, force:', force);
  if (Platform.OS !== 'android' || running || activity.restoring) return;
  if (!smsInboxAvailable) {
    console.log('SMS inbox unavailable');
    return;
  }
  if (!force && Date.now() - lastRun < 60_000) return;

  running = true;
  try {
    const permissionResult = await ensurePermission();
    if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
      console.log('SMS permission not granted, skipping import');
      return;
    };
    console.log('permission granted, scanning inbox');

    const settings = useSettingsStore.getState();
    const since = force ? 0 : Math.max(0, settings.smsScannedUntil - DAY); // 24h overlap, see above
    console.log('SMS scan started', { since });
    const result = await scan(since);
    console.log('SMS scan completed', result);

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