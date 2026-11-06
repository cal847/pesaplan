// frontend/src/lib/db/database.ts
import * as SQLite from 'expo-sqlite';

import { migrate } from './migrations';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/** One shared connection. The first call opens and migrates, and later calls reuse it. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!opening) {
    opening = (async () => {
      const db = await SQLite.openDatabaseAsync('pesaplan.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    })().catch((error) => {
      opening = null; // so the next call retries instead of caching the failure
      throw error;
    });
  }
  return opening;
}