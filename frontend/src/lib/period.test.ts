// frontend/src/lib/period.test.ts
import { periodBounds } from './period';
import { formatStamp } from './time';
import { formatKsh } from './sms/money';

const thursday = new Date(2026, 4, 14, 12, 0); // Thu 14 May 2026

describe('periodBounds', () => {
  it('weeks run Monday to Monday', () => {
    expect(periodBounds('Weekly', new Date(2026, 4, 13, 15, 0))).toEqual({
      from: '2026-05-11T00:00',
      to: '2026-05-18T00:00',
    });
  });
  it('rolls December over into January', () => {
    expect(periodBounds('Monthly', new Date(2026, 11, 31, 23, 59))).toEqual({
      from: '2026-12-01T00:00',
      to: '2027-01-01T00:00',
    });
  });
  it('covers a single day and a year', () => {
    expect(periodBounds('Daily', thursday)).toEqual({ from: '2026-05-14T00:00', to: '2026-05-15T00:00' });
    expect(periodBounds('Yearly', thursday)).toEqual({ from: '2026-01-01T00:00', to: '2027-01-01T00:00' });
  });
});

describe('formatStamp', () => {
  it.each<[string, string]>([
    ['2026-05-14T09:33', 'Today, 9:33 AM'],
    ['2026-05-13T19:32', 'Yesterday, 7:32 PM'],
    ['2026-05-11T20:55', 'Monday, 8:55 PM'],
    ['2026-04-30T08:01', '30 Apr, 8:01 AM'],
    ['2025-12-31T00:05', '31 Dec 2025, 12:05 AM'],
  ])('%s', (stamp, expected) => {
    expect(formatStamp(stamp, thursday)).toBe(expected);
  });
});

it('formats a negative balance', () => {
  expect(formatKsh(-123456)).toBe('Ksh -1,234.56');
});