import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type Db = Pick<SQLiteDatabase, 'runAsync' | 'getAllAsync' | 'getFirstAsync'>;
export type BudgetIcon = ComponentProps<typeof Ionicons>['name'];

export type BudgetItem = {
  id: string;
  icon: string;
  name: string;
  amountCents: number;
  backgroundColor: string;
  dueDate?: string | null;
};

export type BudgetItemInput = Omit<BudgetItem, 'id'>;
export type BudgetSection = { id: string; title: string; items: BudgetItem[] };

type ItemRow = BudgetItem & { sectionId: string };

// Loads all rows
export async function loadBudget(db: Db): Promise<BudgetSection[]> {
  const sections = await db.getAllAsync<{ id: string; title: string }>(
    'SELECT id, title FROM budget_sections ORDER BY position, created_at'
  );
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT id, section_id AS sectionId, name, icon, color AS backgroundColor,
            amount_cents AS amountCents
     FROM budget_items ORDER BY position, created_at`
  );

  const grouped = new Map<string, BudgetItem[]>();
  for (const { sectionId, ...item } of rows) {
    const list = grouped.get(sectionId) ?? [];
    list.push(item);
    grouped.set(sectionId, list);
  }
  return sections.map((s) => ({ ...s, items: grouped.get(s.id) ?? [] }));
}

// Asserts name and amount type
function assertValid(input: BudgetItemInput) {
  if (!input.name.trim()) throw new Error('An item needs a name');
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <  0) {
    throw new Error('amountCents must be a positive whole number of cents');
  }
}

// Prevents duplicate budget names
async function nameTaken(db: Db, sectionId: string, name: string, exceptId = '') {
  const row = await db.getFirstAsync<{ found: number }>(
    `SELECT 1 AS found FROM budget_items
     WHERE section_id = ? AND name = ? COLLATE NOCASE AND id <> ?`,
    [sectionId, name.trim(), exceptId]
  );
  return row !== null;
}

export async function addItem(
  db: Db,
  sectionId: string,
  input: BudgetItemInput
): Promise<'ok' | 'duplicate'> {
  assertValid(input);
  if (await nameTaken(db, sectionId, input.name)) return 'duplicate';

  await db.runAsync(
    `INSERT INTO budget_items
       (id, section_id, name, icon, color, amount_cents, position, created_at, due_date)
     VALUES (?, ?, ?, ?, ?, ?,
       (SELECT COALESCE(MAX(position), -1) + 1 FROM budget_items WHERE section_id = ?), ?)`,
    [
      Crypto.randomUUID(), sectionId, input.name.trim(), input.icon,
      input.backgroundColor, input.amountCents, sectionId, Date.now(),
    ]
  );
  return 'ok';
}

export async function updateItem(
  db: Db,
  id: string,
  input: BudgetItemInput
): Promise<'ok' | 'duplicate' | 'missing'> {
  assertValid(input);
  const row = await db.getFirstAsync<{ sectionId: string }>(
    'SELECT section_id AS sectionId FROM budget_items WHERE id = ?',
    [id]
  );
  if (!row) return 'missing';
  if (await nameTaken(db, row.sectionId, input.name, id)) return 'duplicate';

  await db.runAsync(
    'UPDATE budget_items SET name = ?, icon = ?, color = ?, amount_cents = ?, due_date = ? WHERE id = ?',
    [input.name.trim(), input.icon, input.backgroundColor, input.amountCents, input.dueDate ?? null, id]
  );
  return 'ok';
}

export async function deleteItem(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM budget_items WHERE id = ?', [id]);
}

export async function renameSection(
  db: Db,
  id: string,
  title: string
): Promise<'ok' | 'duplicate'> {
  const clean = title.trim();
  if (!clean) throw new Error('A category needs a name');

  const clash = await db.getFirstAsync<{ found: number }>(
    'SELECT 1 AS found FROM budget_sections WHERE title = ? COLLATE NOCASE AND id <> ?',
    [clean, id]
  );
  if (clash) return 'duplicate';

  await db.runAsync('UPDATE budget_sections SET title = ? WHERE id = ?', [clean, id]);
  return 'ok';
}