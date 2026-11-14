import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { ParsedTransaction, TransactionType } from '@/lib/sms/types';

// Only the methods used here, so tests can pass a stand-in
type Db = Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'withTransactionAsync'>;

export type StoredTransaction = {
  id: string;
  code: string | null;
  type: TransactionType;
  amountCents: number;
  feeCents: number;
  merchant: string | null;
  accountNumber: string | null;
  categoryId: string | null;
  occurredAt: string;
  source: 'sms' | 'manual';
  createdAt: number;
  simKey: string; // '' when the SIM isn't known
};

export type Totals = { incomeCents: number; expenseCents: number; savingsCents: number };

// snake_case in the database, camelCase in the app
const COLUMNS = `id, code, type, amount_cents AS amountCents, fee_cents AS feeCents,
  merchant, account_number AS accountNumber, category_id AS categoryId,
  occurred_at AS occurredAt, source, created_at AS createdAt, sim_key AS simKey`;

// ON CONFLICT(code) only skips a repeated M-Pesa code. "INSERT OR IGNORE" would
// also silently swallow bad data (a zero amount), and report it as a duplicate.
const INSERT = `
  INSERT INTO transactions
    (id, code, type, amount_cents, fee_cents, merchant, account_number,
     category_id, occurred_at, source, created_at, sim_key)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(code, sim_key) DO NOTHING`;

type NewTransaction = Omit<StoredTransaction, 'id' | 'createdAt'>;

/** Returns the new id, or null when the code already exists. */
async function insert(db: Db, tx: NewTransaction): Promise<string | null> {
  const id = Crypto.randomUUID();
  const result = await db.runAsync(INSERT, [
    id, tx.code, tx.type, tx.amountCents, tx.feeCents, tx.merchant,
    tx.accountNumber, tx.categoryId, tx.occurredAt, tx.source, Date.now(), tx.simKey
  ]);
  return result.changes === 1 ? id : null;
}

export async function saveParsed(db: Db, parsed: ParsedTransaction): Promise<'saved' | 'duplicate'> {
  const id = await insert(db, {
    code: parsed.code,
    simKey: parsed.simKey ?? 'unknown',
    type: parsed.type,
    amountCents: parsed.amountCents,
    feeCents: parsed.feeCents,
    merchant: parsed.merchant,
    accountNumber: parsed.accountNumber,
    categoryId: null,
    occurredAt: parsed.occurredAt,
    source: 'sms',
  });
  return id ? 'saved' : 'duplicate';
}

/** One transaction for the whole batch, which is far faster than separate writes. */
export async function saveParsedMany(db: Db, items: ParsedTransaction[]) {
  let saved = 0;
  let duplicates = 0;
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      if ((await saveParsed(db, item)) === 'saved') saved++;
      else duplicates++;
    }
  });
  return { saved, duplicates };
}

export type ManualInput = {
  type: TransactionType;
  amountCents: number;
  merchant?: string | null;
  categoryId?: string | null;
  occurredAt?: string;
  simKey?: string;
};

export async function addManual(db: Db, input: ManualInput): Promise<string> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('amountCents must be a positive whole number of cents');
  }
  const id = await insert(db, {
    code: null, // manual entries have no M-Pesa code
    type: input.type,
    amountCents: input.amountCents,
    feeCents: 0,
    merchant: input.merchant?.trim() || null,
    accountNumber: null,
    categoryId: input.categoryId ?? null,
    occurredAt: input.occurredAt ?? toLocalStamp(Date()),
    source: 'manual',
    simKey: input.simKey ?? 'unknown',
  });
  return id!; // a null code can never conflict, so this always inserts
}

export function listTransactions(
  db: Db,
  { limit = 20, offset = 0, type, simKey }: { limit?: number; offset?: number; type?: TransactionType; simKey?: string | null } = {}
) {
  const filters: string[] = [];
  const params: (string | number)[] = [];

  if (type) {
    filters.push('type = ?');
    params.push(type);
  }
  if (simKey !== null) {
    filters.push('sim_key = ?');
    params.push(simKey);
  }
  return db.getAllAsync<StoredTransaction>(
    // If 'type' exists, use WHERE type=? AND sim_key=?
    // If 'type' is missing, use WHERE sim_key=?
    `SELECT ${COLUMNS} FROM transactions
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY occurred_at DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
}

/** Totals. Expense amounts already include the M-Pesa fee. */
export async function totalsBetween(db: Db, from: string, to: string, simKey: string | null = null): Promise<Totals> {
  const filters: string[] = ['occurred_at >= ?', 'occurred_at < ?'];
  const params: (string | number)[] = [from, to];

  if (simKey !== null) {
    filters.push('sim_key = ?');
    params.push(simKey);
  }
  const row = await db.getFirstAsync<Totals>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS incomeCents,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expenseCents,
       COALESCE(SUM(CASE WHEN type = 'savings' THEN amount_cents END), 0) AS savingsCents
     FROM transactions
     WHERE ${filters.join(' AND ')}`,
    params
  );
  return row ?? { incomeCents: 0, expenseCents: 0, savingsCents: 0 };
}

// Lists transactions between a given range
export function listBetween(db: Db, from: string, to: string, simKey: string | null) {
  const filters: string[] = ['occured_at >= ?', 'occured_at < ?']
  const params: (string | number)[] = [from, to]

  if (simKey != null) {
    filters.push('sim_key = ?');
    params.push(simKey);
  }

  return db.getAllAsync<StoredTransaction>(
    `SELECT ${COLUMNS} FROM transactions
     WHERE ${filters.join( 'AND' )}
     ORDER BY occurred_at ASC, created_at ASC`,
    [...params, simKey]
  );
}

// Counts transactions between a given range
export async function countBetween(db: Db, from: string, to: string, simKey: string): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transactions WHERE occurred_at >= ? AND occurred_at < ? AND sim_key = ?`,
    [from, to, simKey]
  );
  return row?.n ?? 0;
}

export type DailyTotals = { day: string; incomeCents: number; expenseCents: number };

// Calculates income and expense per day.
export function dailyTotalsBetween(db: Db, from: string, to: string, simKey: string | null) {
  const filters: string[] = ['occurred_at >= ?', 'occurred_at < ?'];
  const params: (string | number)[] = [from, to];
  if (simKey !== null) {
    filters.push('sim_key = ?');
    params.push(simKey);
  }

  return db.getAllAsync<DailyTotals>(
    `SELECT substr(occurred_at, 1, 10) AS day,
       COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_cents END), 0) AS incomeCents,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expenseCents
     FROM transactions
     WHERE ${filters.join(' AND ')}
     GROUP BY day
     ORDER BY day`,
    params
  );
}