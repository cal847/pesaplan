jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_a: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

import { BackupData, FORMAT_VERSION, parseBackup, serializeBackup } from './format';
const tx = (over: object = {}) => ({
  id: 't1', code: 'UEEMG49UN7', type: 'expense', amountCents: 3000, feeCents: 0, merchant: 'SHOP',
  accountNumber: null, categoryId: null, occurredAt: '2026-05-14T09:33', source: 'sms', createdAt: 1, ...over,
});
const data = (over: object = {}): BackupData =>
  ({
    transactions: [tx()],
    budgetSections: [{ id: 's1', title: 'Income', position: 0, createdAt: 1 }],
    budgetItems: [{ id: 'i1', sectionId: 's1', name: 'Salary', icon: '💼', color: '#B8EBC5', amountCents: 100000, position: 0, createdAt: 1 }],
    settings: { themePreference: 'dark', spendingLimitCents: 3000000, spendingPeriod: 'Monthly' },
    ...over,
  }) as BackupData;

const SCHEMA = 3;

it('round-trips a backup', async () => {
  const result = await parseBackup(await serializeBackup(data(), SCHEMA), SCHEMA);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.file.data).toEqual(data());
});

it('detects a file changed after it was written', async () => {
  const text = (await serializeBackup(data(), SCHEMA)).replace('"amountCents":3000', '"amountCents":9999');
  expect(await parseBackup(text, SCHEMA)).toEqual({ ok: false, reason: 'corrupt' });
});

it('rejects files that are not PesaBudge backups', async () => {
  expect(await parseBackup('nope', SCHEMA)).toEqual({ ok: false, reason: 'not_json' });
  expect(await parseBackup('{"app":"other"}', SCHEMA)).toEqual({ ok: false, reason: 'wrong_app' });
});

it('rejects backups from a newer app', async () => {
  const text = await serializeBackup(data(), SCHEMA + 1);
  expect(await parseBackup(text, SCHEMA)).toEqual({ ok: false, reason: 'too_new' });
  const future = JSON.stringify({ ...JSON.parse(await serializeBackup(data(), SCHEMA)), formatVersion: FORMAT_VERSION + 1 });
  expect(await parseBackup(future, SCHEMA)).toEqual({ ok: false, reason: 'too_new' });
});

describe('invalid contents with a correct checksum', () => {
  it.each([
    ['a zero amount', data({ transactions: [tx({ amountCents: 0 })] })],
    ['a badly formatted date', data({ transactions: [tx({ occurredAt: '14/05/2026' })] })],
    ['the same message twice', data({ transactions: [tx(), tx({ id: 't2' })] })],
    ['an item in a missing category', data({ budgetItems: [{ id: 'i1', sectionId: 'nope', name: 'x', icon: 'a', color: 'b', amountCents: 1, position: 0, createdAt: 1 }] })],
    ['an unknown theme', data({ settings: { themePreference: 'neon', spendingLimitCents: null, spendingPeriod: 'Monthly' } })],
  ])('%s', async (_name, bad) => {
    expect(await parseBackup(await serializeBackup(bad, SCHEMA), SCHEMA)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('allows both halves of a transfer between your own SIMs', async () => {
    const both = data({ transactions: [tx(), tx({ id: 't2', type: 'income' })] });
    expect((await parseBackup(await serializeBackup(both, SCHEMA), SCHEMA)).ok).toBe(true);
  });
});