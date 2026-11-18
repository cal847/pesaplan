import * as Crypto from 'expo-crypto';

export const BACKUP_APP = 'pesaplan';
export const FORMAT_VERSION = 1;

export type BackupTransaction = {
  id: string;
  code: string | null;
  type: 'income' | 'expense' | 'savings';
  amountCents: number;
  feeCents: number;
  merchant: string | null;
  accountNumber: string | null;
  categoryId: string | null;
  occurredAt: string;
  source: 'sms' | 'manual';
  createdAt: number;
};
export type BackupSection = { id: string; title: string; position: number; createdAt: number };
export type BackupItem = {
  id: string; sectionId: string; name: string; icon: string; color: string;
  amountCents: number; position: number; createdAt: number;
};
export type BackupSettings = {
  themePreference: 'light' | 'dark' | 'system';
  spendingLimitCents: number | null;
  spendingPeriod: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
};
export type BackupData = {
  transactions: BackupTransaction[];
  budgetSections: BackupSection[];
  budgetItems: BackupItem[];
  settings: BackupSettings;
};
export type BackupFile = {
  app: typeof BACKUP_APP;
  formatVersion: number;
  schemaVersion: number; // the database version it was made from
  createdAt: number;
  checksum: string;
  data: BackupData;
};

export type ParseResult =
  | { ok: true; file: BackupFile }
  | { ok: false; reason: 'not_json' | 'wrong_app' | 'too_new' | 'corrupt' | 'invalid' };

const sha256 = (text: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);

export async function serializeBackup(data: BackupData, schemaVersion: number, now = Date.now()): Promise<string> {
  const file: BackupFile = {
    app: BACKUP_APP,
    formatVersion: FORMAT_VERSION,
    schemaVersion,
    createdAt: now,
    checksum: await sha256(JSON.stringify(data)),
    data,
  };
  return JSON.stringify(file);
}

/** Checks a downloaded file completely before anything on the phone is touched. */
export async function parseBackup(text: string, supportedSchema: number): Promise<ParseResult> {
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not_json' };
  }
  if (!raw || raw.app !== BACKUP_APP) return { ok: false, reason: 'wrong_app' };
  if (
    typeof raw.formatVersion !== 'number' || raw.formatVersion > FORMAT_VERSION ||
    typeof raw.schemaVersion !== 'number' || raw.schemaVersion > supportedSchema
  ) {
    return { ok: false, reason: 'too_new' };
  }
  if (typeof raw.checksum !== 'string' || (await sha256(JSON.stringify(raw.data))) !== raw.checksum) {
    return { ok: false, reason: 'corrupt' };
  }
  if (!isValidData(raw.data)) return { ok: false, reason: 'invalid' };
  return { ok: true, file: raw as BackupFile };
}

/* ------------------------------- validation ------------------------------- */

const str = (v: unknown): v is string => typeof v === 'string';
const int = (v: unknown): v is number => Number.isSafeInteger(v);
const strOrNull = (v: unknown) => v === null || str(v);

function isTransaction(t: any): boolean {
  return !!t && str(t.id) && strOrNull(t.code) && ['income', 'expense', 'savings'].includes(t.type) &&
    int(t.amountCents) && t.amountCents > 0 && int(t.feeCents) && t.feeCents >= 0 &&
    strOrNull(t.merchant) && strOrNull(t.accountNumber) && strOrNull(t.categoryId) &&
    str(t.occurredAt) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.occurredAt) &&
    ['sms', 'manual'].includes(t.source) && int(t.createdAt);
}
const isSection = (s: any) =>
  !!s && str(s.id) && str(s.title) && s.title.trim().length > 0 && int(s.position) && int(s.createdAt);
const isItem = (i: any) =>
  !!i && str(i.id) && str(i.sectionId) && str(i.name) && i.name.trim().length > 0 && str(i.icon) &&
  str(i.color) && int(i.amountCents) && i.amountCents > 0 && int(i.position) && int(i.createdAt);

function isValidData(d: any): d is BackupData {
  if (!d || !Array.isArray(d.transactions) || !Array.isArray(d.budgetSections) || !Array.isArray(d.budgetItems)) {
    return false;
  }
  const s = d.settings;
  if (
    !s || !['light', 'dark', 'system'].includes(s.themePreference) ||
    !(s.spendingLimitCents === null || (int(s.spendingLimitCents) && s.spendingLimitCents > 0)) ||
    !['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(s.spendingPeriod)
  ) {
    return false;
  }
  if (!d.transactions.every(isTransaction) || !d.budgetSections.every(isSection) || !d.budgetItems.every(isItem)) {
    return false;
  }

  // the database would refuse these, so catch them before anything is deleted
  const ids = new Set<string>();
  const identities = new Set<string>();
  for (const t of d.transactions) {
    if (ids.has(t.id)) return false;
    ids.add(t.id);
    if (t.code) {
      const key = `${t.code}|${t.type}`;
      if (identities.has(key)) return false;
      identities.add(key);
    }
  }
  const sectionIds = new Set<string>();
  const titles = new Set<string>();
  for (const sec of d.budgetSections) {
    const title = sec.title.toLowerCase();
    if (sectionIds.has(sec.id) || titles.has(title)) return false;
    sectionIds.add(sec.id);
    titles.add(title);
  }
  const itemIds = new Set<string>();
  const itemNames = new Set<string>();
  for (const it of d.budgetItems) {
    const key = `${it.sectionId}|${it.name.toLowerCase()}`;
    if (!sectionIds.has(it.sectionId) || itemIds.has(it.id) || itemNames.has(key)) return false;
    itemIds.add(it.id);
    itemNames.add(key);
  }
  return true;
}