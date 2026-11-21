import type { SQLiteDatabase } from 'expo-sqlite';

import { defaultSimLabel } from '@/lib/sms/inbox';

type Db = Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;

export type Sim = { simKey: string; slot: number | null; label: string };

/** Records the SIMs seen in a batch. A name the user chose is never overwritten. */
export async function upsertSims(db: Db, sims: Map<string, number | null>): Promise<void> {
  for (const [simKey, slot] of sims) {
    const known = await db.getFirstAsync<{ n: number }>('SELECT 1 AS n FROM sims WHERE sim_key = ?', [simKey]);
    if (slot !== null) {
      // a slot belongs to one SIM at a time, so an old SIM that was swapped out lets go of it
      await db.runAsync('UPDATE sims SET slot = NULL WHERE slot = ? AND sim_key <> ?', [slot, simKey]);
    }
    if (!known) {
      const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sims');
      await db.runAsync(
        'INSERT INTO sims (sim_key, slot, label, last_seen) VALUES (?, ?, ?, ?)',
        [simKey, slot, slot !== null ? defaultSimLabel(slot) : `SIM ${(count?.n ?? 0) + 1}`, Date.now()]
      );
    } else {
      await db.runAsync(
        'UPDATE sims SET slot = COALESCE(?, slot), last_seen = ? WHERE sim_key = ?',
        [slot, Date.now(), simKey]
      );
    }
  }
}

export function listSims(db: Db): Promise<Sim[]> {
  return db.getAllAsync<Sim>(
    'SELECT sim_key AS simKey, slot, label FROM sims ORDER BY slot IS NULL, slot, label'
  );
}

export async function renameSim(db: Db, simKey: string, label: string): Promise<void> {
  const clean = label.trim().slice(0, 20);
  if (!clean) throw new Error('A SIM needs a name');
  await db.runAsync('UPDATE sims SET label = ? WHERE sim_key = ?', [clean, simKey]);
}