// frontend/src/lib/display.ts
import type { StoredTransaction } from '@/lib/db/transactions';

export const TYPE_EMOJI = { income: '💰', expense: '🛒', savings: '🐷' } as const;

// savings rows have no merchant, and neither do some manual entries
export function transactionTitle(tx: StoredTransaction): string {
  if (tx.merchant) return tx.merchant;
  return tx.type === 'savings' ? 'M-Shwari savings' : tx.type === 'income' ? 'Income' : 'Expense';
}