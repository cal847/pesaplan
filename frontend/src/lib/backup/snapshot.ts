/** Fetches backup data from local SQLite */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { BackupData, BackupItem, BackupSection, BackupTransaction } from './format';

type Db = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync' | 'runAsync' | 'withTransactionAsync' | 'prepareAsync'>;
type Tables = Pick<BackupData, 'transactions' | 'budgetSections' | 'budgetItems'>;

const PAGE = 2000;

// database version
export async function schemaVersion(db: Pick<SQLiteDatabase, 'getFirstAsync'>): Promise<number> {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
}

/** SIM tags are left out on purpose: they only mean something on the phone that made them. */
export async function readTables(db: Db, onProgress?: (fraction: number) => void): Promise<Tables> {
  const total = (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions'))?.n ?? 0;

  const transactions: BackupTransaction[] = [];
  let createdAt = -1;
  let id = '';
  // keyset paging, so a row added while we read can't make us skip or repeat another
  for (;;) {
    const page = await db.getAllAsync<BackupTransaction>(
      `SELECT id, code, type, amount_cents AS amountCents, fee_cents AS feeCents, merchant,
              account_number AS accountNumber, category_id AS categoryId,
              occurred_at AS occurredAt, source, created_at AS createdAt
       FROM transactions
       WHERE created_at > ? OR (created_at = ? AND id > ?)
       ORDER BY created_at, id LIMIT ?`,
      [createdAt, createdAt, id, PAGE]
    );
    if (page.length === 0) break;
    transactions.push(...page);
    ({ createdAt, id } = page[page.length - 1]);
    onProgress?.(Math.min(1, transactions.length / Math.max(total, 1)));
    if (page.length < PAGE) break;
  }

  const budgetSections = await db.getAllAsync<BackupSection>(
    'SELECT id, title, position, created_at AS createdAt FROM budget_sections ORDER BY position, created_at'
  );
  const budgetItems = await db.getAllAsync<BackupItem>(
    `SELECT id, section_id AS sectionId, name, icon, color, amount_cents AS amountCents,
            position, created_at AS createdAt
     FROM budget_items ORDER BY section_id, position, created_at`
  );
  return { transactions, budgetSections, budgetItems };
}

/** Replaces everything in one database transaction: if anything fails, the old data is untouched. */
export async function writeTables(db: Db, data: Tables, onProgress?: (fraction: number) => void): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM budget_items');
    await db.runAsync('DELETE FROM budget_sections');
    await db.runAsync('DELETE FROM transactions');
    await db.runAsync('DELETE FROM sims');

    for (const s of data.budgetSections) {
      await db.runAsync(
        'INSERT INTO budget_sections (id, title, position, created_at) VALUES (?, ?, ?, ?)',
        [s.id, s.title, s.position, s.createdAt]
      );
    }
    for (const i of data.budgetItems) {
      await db.runAsync(
        `INSERT INTO budget_items (id, section_id, name, icon, color, amount_cents, position, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.sectionId, i.name, i.icon, i.color, i.amountCents, i.position, i.createdAt]
      );
    }

    const stmt = await db.prepareAsync(
      `INSERT INTO transactions
         (id, code, sim_key, type, amount_cents, fee_cents, merchant, account_number,
          category_id, occurred_at, source, created_at)
       VALUES ($id, $code, '', $type, $amount, $fee, $merchant, $account, $category, $at, $source, $created)`
    );
    try {
      for (let n = 0; n < data.transactions.length; n++) {
        const t = data.transactions[n];
        const result = await stmt.executeAsync({
          $id: t.id, $code: t.code, $type: t.type, $amount: t.amountCents, $fee: t.feeCents,
          $merchant: t.merchant, $account: t.accountNumber, $category: t.categoryId,
          $at: t.occurredAt, $source: t.source, $created: t.createdAt,
        });
        await result.resetAsync();
        if (n % 500 === 0) onProgress?.(n / data.transactions.length);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}