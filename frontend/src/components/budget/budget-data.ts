export type BudgetItem = { icon: string; name: string; amount: string; backgroundColor: string };
export type BudgetSection = { title: string; items: BudgetItem[] };

export const parseAmount = (s: string) => parseFloat(s.replace(/[^0-9.]/g, '')) || 0;

export const formatAmount = (n: number) =>
  `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const sumItems = (items: BudgetItem[]) =>
  items.reduce((total, item) => total + parseAmount(item.amount), 0);