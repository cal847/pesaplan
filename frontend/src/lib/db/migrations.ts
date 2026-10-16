import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE transactions (
    id             TEXT PRIMARY KEY NOT NULL,
    code           TEXT UNIQUE,
    type           TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
    amount_cents   INTEGER NOT NULL CHECK (amount_cents > 0),
    fee_cents      INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    merchant       TEXT,
    account_number TEXT,
    category_id    TEXT,
    occurred_at    TEXT NOT NULL CHECK (occurred_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]'),    
    source         TEXT NOT NULL CHECK (source IN ('sms', 'manual')),
    created_at     INTEGER NOT NULL
  );
  CREATE INDEX idx_transactions_occurred ON transactions (occurred_at DESC);
  CREATE INDEX idx_transactions_type_occurred ON transactions (type, occurred_at);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= MIGRATIONS.length) return;

  // all steps and the version bump succeed together or not at all
  await db.withTransactionAsync(async () => {
    for (let i = current; i < MIGRATIONS.length; i++) {
      await db.execAsync(MIGRATIONS[i]);
    }
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
}