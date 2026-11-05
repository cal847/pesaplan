import { checkSecret, formatWait, lockoutSeconds, shouldLock, triesBeforeLockout } from './rules';

describe('checkSecret: PIN', () => {
  it.each(['402817', '123450', '121212'])('accepts %s', (v) => {
    expect(checkSecret('pin', v)).toBe('ok');
  });
  it.each(['12345', '1234567', '12345a', '', '12 456'])('rejects the wrong shape: %p', (v) => {
    expect(checkSecret('pin', v)).toBe('invalid');
  });
  it.each(['000000', '111111', '123456', '654321', '012345', '987654'])('rejects easy PIN %s', (v) => {
    expect(checkSecret('pin', v)).toBe('weak');
  });
});

describe('checkSecret: password', () => {
  it('needs 8 to 64 real characters', () => {
    expect(checkSecret('password', 'short')).toBe('invalid');
    expect(checkSecret('password', 'a'.repeat(65))).toBe('invalid');
    expect(checkSecret('password', '        ')).toBe('invalid');
  });
  it('rejects repeats and common passwords', () => {
    expect(checkSecret('password', 'aaaaaaaa')).toBe('weak');
    expect(checkSecret('password', 'Password1')).toBe('weak');
    expect(checkSecret('password', '12345678')).toBe('weak');
  });
  it('accepts a normal one', () => {
    expect(checkSecret('password', 'blue-Kettle-42')).toBe('ok');
  });
});

describe('lockoutSeconds', () => {
  it('has no wait for the first four misses', () => {
    [0, 1, 2, 3, 4].forEach((n) => expect(lockoutSeconds(n)).toBe(0));
  });
  it('waits on every fifth miss, doubling each time', () => {
    expect(lockoutSeconds(5)).toBe(30);
    expect(lockoutSeconds(6)).toBe(0);
    expect(lockoutSeconds(10)).toBe(60);
    expect(lockoutSeconds(15)).toBe(120);
  });
  it('never waits more than an hour', () => {
    expect(lockoutSeconds(60)).toBe(3600);
  });
  it('counts the tries left before the next wait', () => {
    expect(triesBeforeLockout(0)).toBe(5);
    expect(triesBeforeLockout(1)).toBe(4);
    expect(triesBeforeLockout(4)).toBe(1);
    expect(triesBeforeLockout(5)).toBe(5);
  });
});

describe('shouldLock', () => {
  it('does not lock if the app never went to the background', () => {
    expect(shouldLock(null, 1000, 0)).toBe(false);
  });
  it('locks only after the chosen time away', () => {
    expect(shouldLock(0, 59_000, 60)).toBe(false);
    expect(shouldLock(0, 60_000, 60)).toBe(true);
    expect(shouldLock(0, 0, 0)).toBe(true);
  });
  it('locks if the clock was moved backwards', () => {
    expect(shouldLock(10_000, 5_000, 300)).toBe(true);
  });
});

it('formats waits', () => {
  expect(formatWait(1)).toBe('1 second');
  expect(formatWait(30)).toBe('30 seconds');
  expect(formatWait(60)).toBe('1 minute');
  expect(formatWait(61)).toBe('2 minutes');
});