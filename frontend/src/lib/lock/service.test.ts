// frontend/src/lib/lock/service.test.ts
const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockStore.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mockStore.delete(key);
  },
}));

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algorithm: string, data: string) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

import {
  createSecret, disableLock, getConfig, lockoutRemaining,
  recordBiometricSuccess, setBiometrics, setTimeoutSec, verifySecret,
} from './service';

const T0 = 1_700_000_000_000;
const PIN = '402817';

beforeEach(() => mockStore.clear());

describe('createSecret', () => {
  it('rejects bad and easy secrets and leaves the lock off', async () => {
    expect(await createSecret('pin', '12345')).toBe('invalid');
    expect(await createSecret('pin', '123456')).toBe('weak');
    expect(await createSecret('password', 'short')).toBe('invalid');
    expect((await getConfig()).enabled).toBe(false);
  });

  it('stores a salted hash and never the secret itself', async () => {
    expect(await createSecret('pin', PIN)).toBe('ok');
    const stored = JSON.parse([...mockStore.values()][0]);
    expect(Object.keys(stored).sort()).toEqual(
      ['biometrics', 'failed', 'hash', 'kind', 'lockedUntil', 'salt', 'timeoutSec']
    );
    expect(stored.hash).not.toBe(PIN);
  });
});

describe('verifySecret', () => {
  it('says so when no lock is set', async () => {
    expect(await verifySecret(PIN, T0)).toEqual({ ok: false, reason: 'not_set' });
  });

  it('accepts the right PIN and counts tries on wrong ones', async () => {
    await createSecret('pin', PIN);
    expect(await verifySecret(PIN, T0)).toEqual({ ok: true });
    expect(await verifySecret('000001', T0)).toEqual({ ok: false, reason: 'wrong', triesLeft: 4 });
    expect(await verifySecret('000001', T0)).toEqual({ ok: false, reason: 'wrong', triesLeft: 3 });
  });

  it('works for passwords too', async () => {
    await createSecret('password', 'blue-Kettle-42');
    expect(await verifySecret('blue-Kettle-42', T0)).toEqual({ ok: true });
    expect(await verifySecret('blue-kettle-42', T0)).toMatchObject({ ok: false, reason: 'wrong' });
  });

  it('locks out after five misses, refuses even the right PIN, then doubles the wait', async () => {
    await createSecret('pin', PIN);
    let now = T0;
    for (let i = 0; i < 4; i++) await verifySecret('000001', now);
    expect(await verifySecret('000001', now)).toEqual({ ok: false, reason: 'locked', secondsLeft: 30 });

    expect(await verifySecret(PIN, now + 10_000)).toEqual({ ok: false, reason: 'locked', secondsLeft: 20 });
    expect(await lockoutRemaining(now + 10_000)).toBe(20);

    now += 31_000;
    expect(await lockoutRemaining(now)).toBe(0);
    for (let i = 0; i < 4; i++) await verifySecret('000001', now);
    expect(await verifySecret('000001', now)).toEqual({ ok: false, reason: 'locked', secondsLeft: 60 });
  });

  it('resets the count after a correct PIN', async () => {
    await createSecret('pin', PIN);
    await verifySecret('000001', T0);
    await verifySecret('000001', T0);
    await verifySecret(PIN, T0);
    expect(await verifySecret('000001', T0)).toEqual({ ok: false, reason: 'wrong', triesLeft: 4 });
  });

  it('resets the count after a biometric success', async () => {
    await createSecret('pin', PIN);
    await verifySecret('000001', T0);
    await verifySecret('000001', T0);
    await recordBiometricSuccess();
    expect(await verifySecret('000001', T0)).toEqual({ ok: false, reason: 'wrong', triesLeft: 4 });
  });

  it('caps the wait when the clock was set far back', async () => {
    await createSecret('pin', PIN);
    for (let i = 0; i < 5; i++) await verifySecret('000001', T0);
    const result = await verifySecret(PIN, T0 - 10 * 86_400_000);
    expect(result).toEqual({ ok: false, reason: 'locked', secondsLeft: 3600 });
  });
});

describe('settings', () => {
  it('keeps timeout and biometrics when the secret is replaced', async () => {
    await createSecret('pin', PIN);
    await setTimeoutSec(0);
    await setBiometrics(true);
    await createSecret('password', 'blue-Kettle-42');
    expect(await getConfig()).toEqual({ enabled: true, kind: 'password', timeoutSec: 0, biometrics: true });
  });

  it('ignores timeouts that are not offered', async () => {
    await createSecret('pin', PIN);
    await setTimeoutSec(12345);
    expect((await getConfig()).timeoutSec).toBe(60);
  });
});

describe('disableLock', () => {
  it('needs the right secret', async () => {
    await createSecret('pin', PIN);
    expect(await disableLock('000001', T0)).toMatchObject({ ok: false, reason: 'wrong' });
    expect((await getConfig()).enabled).toBe(true);
    expect(await disableLock(PIN, T0)).toEqual({ ok: true });
    expect((await getConfig()).enabled).toBe(false);
  });
});s