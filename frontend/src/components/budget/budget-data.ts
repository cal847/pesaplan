export type { BudgetItem, BudgetItemInput, BudgetSection } from '@/lib/db/budget';
import type { BudgetItem } from '@/lib/db/budget';

export const sumItems = (items: BudgetItem[]) =>
  items.reduce((total, item) => total + item.amountCents, 0);

export const parseAmount = (s: string) => parseFloat(s.replace(/[^0-9.]/g, '')) || 0;

export const formatAmount = (n: number) =>
  `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
