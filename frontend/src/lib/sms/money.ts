import type { TransactionType } from './types';

/** "+Ksh 600.00" for income, "-Ksh 30.00" for expenses, no sign for savings. */
export function formatSigned(type: TransactionType, cents: number): string {
  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : '';
  return `${sign}${formatKsh(cents)}`;
}

/** "1,051.30" -> 105130. Reads the digits directly, so there's no floating-point error. */
export function kshToCents(text: string): number {
  const [whole = '0', fraction = ''] = text.replace(/,/g, '').trim().split('.');
  const cents = (fraction + '00').slice(0, 2);
  return parseInt(whole || '0', 10) * 100 + parseInt(cents, 10);
}

/** 2132449 -> "Ksh 21,324.49". For display only. */
export function formatKsh(cents: number): string {
  return `Ksh ${(cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function centsToPlain(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}