// frontend/src/lib/backup/drive-helpers.test.ts
import { backupFileName, backupsToPrune, DriveFile, mapDriveError, multipartBody, query } from './drive-helpers';

const file = (id: string, createdTime: string): DriveFile => ({ id, name: id, size: 1, createdTime });

it('keeps the newest three backups and prunes the rest', () => {
  const files = [
    file('a', '2026-01-01T00:00:00.000Z'), file('d', '2026-04-01T00:00:00.000Z'),
    file('b', '2026-02-01T00:00:00.000Z'), file('c', '2026-03-01T00:00:00.000Z'),
  ];
  expect(backupsToPrune(files).map((f) => f.id)).toEqual(['a']);
  expect(backupsToPrune(files.slice(0, 2))).toEqual([]);
});

it('builds a file name without colons or dots', () => {
  expect(backupFileName(new Date('2026-11-17T14:30:05.123Z'))).toBe('pesabudge-backup-2026-11-17T14-30-05-123Z.json');
});

it('builds a multipart body with both parts', () => {
  const body = multipartBody({ name: 'x.json' }, '{"a":1}', 'BOUND');
  expect(body.startsWith('--BOUND\r\n')).toBe(true);
  expect(body.endsWith('--BOUND--')).toBe(true);
  expect(body).toContain('{"name":"x.json"}');
  expect(body).toContain('{"a":1}');
});

it('encodes query values', () => {
  expect(query({ q: "name contains 'a b'", spaces: 'appDataFolder' })).toBe(
    'q=name%20contains%20\'a%20b\'&spaces=appDataFolder'
  );
});

describe('mapDriveError', () => {
  const body = (reason: string) => JSON.stringify({ error: { errors: [{ reason }] } });
  it.each([
    [401, '', 'auth'],
    [403, body('storageQuotaExceeded'), 'quota'],
    [403, body('userRateLimitExceeded'), 'server'],
    [403, body('accessNotConfigured'), 'auth'],
    [404, '', 'not_found'],
    [429, '', 'server'],
    [503, '', 'server'],
    [400, '', 'unknown'],
  ])('%i %s -> %s', (status, text, kind) => {
    expect(mapDriveError(status, text).kind).toBe(kind);
  });
});