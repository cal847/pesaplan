import type { SQLiteDatabase } from 'expo-sqlite';

const MIGRATIONS: string[] = [
  //v1: transactions
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

  // v2: budget
  `
  CREATE TABLE budget_sections (
    id         TEXT PRIMARY KEY NOT NULL,
    title      TEXT NOT NULL CHECK (length(trim(title)) > 0),
    position   INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX idx_budget_sections_title ON budget_sections (title COLLATE NOCASE);

  CREATE TABLE budget_items (
    id           TEXT PRIMARY KEY NOT NULL,
    section_id   TEXT NOT NULL REFERENCES budget_sections (id) ON DELETE CASCADE,
    name         TEXT NOT NULL CHECK (length(trim(name)) > 0),
    icon         TEXT NOT NULL,
    color        TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    position     INTEGER NOT NULL,
    created_at   INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX idx_budget_items_name ON budget_items (section_id, name COLLATE NOCASE);
  CREATE INDEX idx_budget_items_section ON budget_items (section_id, position);

  INSERT INTO budget_sections (id, title, position, created_at) VALUES
    (lower(hex(randomblob(16))), 'Income',                0, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    (lower(hex(randomblob(16))), 'The Essentials',        1, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    (lower(hex(randomblob(16))), 'Subscriptions',         2, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    (lower(hex(randomblob(16))), 'Savings & Investments', 3, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    (lower(hex(randomblob(16))), 'Debt',                  4, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
  `,

  // v3: seed default VAtegory valuees; users can edit them 
  `INSERT INTO budget_items (
    id, section_id, name, icon, color, amount_cents, position, created_at
  )
  VALUES
    -- Income: green
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Income'),
      'Salary', 'cash-outline', '#68F858', 10000, 0,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Income'),
      'Side Hustle', 'briefcase-outline', '#44ECA3', 290120, 1,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),

    -- Essentials: blue
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'The Essentials'),
      'Rent', 'home-outline', '#4FA8F2', 2310, 0,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'The Essentials'),
      'Groceries', 'cart-outline', '#67CAE8', 4210, 1,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'The Essentials'),
      'Transport', 'bus-outline', '#3FBCE3', 420, 2,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'The Essentials'),
      'Electricity', 'flash-outline', '#25B8E5', 5034, 3,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),

    -- Subscriptions: purple
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Subscriptions'),
      'Netflix', 'film-outline', '#B234D4', 230, 0,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Subscriptions'),
      'Spotify', 'musical-notes-outline', '#D662F7', 234, 1,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Subscriptions'),
      'Internet', 'wifi-outline', '#D168EE', 424, 2,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),

    -- Savings & Investments: bright green
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Savings & Investments'),
      'Emergency Fund', 'shield-checkmark-outline', '#68F858', 240, 0,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Savings & Investments'),
      'Investments', 'trending-up-outline', '#44ECA3', 2313340, 1,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Savings & Investments'),
      'Goal Savings', 'flag-outline', '#E1DE31', 2130, 2,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),

    -- Debt: nude / muted red shades
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Debt'),
      'Credit Card', 'card-outline', '#E8C7C0', 14320, 0,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Debt'),
      'Loan', 'document-text-outline', '#DDB3AA', 2420, 1,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    ),
    (
      lower(hex(randomblob(16))),
      (SELECT id FROM budget_sections WHERE title = 'Debt'),
      'Mobile Loan', 'phone-portrait-outline', '#D2A096', 230, 2,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000
    );
  `,
  // v4: Add optional due date for subscriptions
  `
  ALTER TABLE budget_items
  ADD COLUMN due_date TEXT
  CHECK (
    due_date IS NULL OR (
      due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND length(due_date) = 10
    )
  );
  `,

  //v5: Include SIM tagging to support dual sim phones.
  `
  ALTER TABLE transactions
  ADD COLUMN sim_key TEXT NOT NULL DEFAULT 'unknown';

  CREATE TABLE sims (
    sim_key TEXT PRIMARY KEY NOT NULL,
    slot INTERGER,
    label TEXT NOT NULL,
    last_seen INTEGER NOT NULL
  );
  `,

  //v6: Add unique constraint on code + sim_key to avoid duplicates when importing from multiple SIMs.
  `ALTER TABLE transactions RENAME TO transactions_old;

  CREATE TABLE transactions (
    id             TEXT PRIMARY KEY NOT NULL,
    code           TEXT,
    type           TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
    amount_cents   INTEGER NOT NULL CHECK (amount_cents > 0),
    fee_cents      INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
    merchant       TEXT,
    account_number TEXT,
    category_id    TEXT,
    occurred_at    TEXT NOT NULL CHECK (
      occurred_at GLOB
      '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]'
    ),
    source         TEXT NOT NULL CHECK (source IN ('sms', 'manual')),
    created_at     INTEGER NOT NULL,
    sim_key        TEXT NOT NULL DEFAULT 'unknown'
  );

  INSERT INTO transactions (
    id, code, type, amount_cents, fee_cents, merchant, account_number,
    category_id, occurred_at, source, created_at, sim_key
  )
  SELECT
    id, code, type, amount_cents, fee_cents, merchant, account_number,
    category_id, occurred_at, source, created_at, sim_key
  FROM transactions_old;

  DROP TABLE transactions_old;

  CREATE INDEX idx_transactions_occurred
    ON transactions (occurred_at DESC);
  CREATE INDEX idx_transactions_type_occurred
    ON transactions (type, occurred_at);
  CREATE UNIQUE INDEX idx_transactions_code_sim_key
    ON transactions (code, sim_key);
  `,
  //v7: Alter unique constraint from (code, sim_key) to (code, type) to prevent duplicate transactions on restore
  `
  DROP INDEX IF EXISTS id_transactions_code_sim_key;
  CREATE UNIQUE INDEX id_transactions_code_type ON transactions (code, type);

  `
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