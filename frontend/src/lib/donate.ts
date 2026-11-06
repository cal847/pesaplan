export const DONATION_NUMBER = '0797511759';

/** Digits only, keeping a leading +, which is what a send-money field accepts. */
export const toDialable = (n: string) => n.replace(/[^\d+]/g, '');

/** "0712345678" -> "0712 345 678", "+254712345678" -> "+254 712 345 678" */
export function formatPhone(n: string): string {
  const d = toDialable(n);
  if (/^0\d{9}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (/^\+254\d{9}$/.test(d)) return `+254 ${d.slice(4, 7)} ${d.slice(7, 10)} ${d.slice(10)}`;
  return n;
}