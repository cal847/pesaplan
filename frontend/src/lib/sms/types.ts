// frontend/src/lib/sms/types.ts
export type TransactionType = 'income' | 'expense' | 'savings';

export type ParsedTransaction = {
  /** M-Pesa reference, e.g. "UEEMG49UN7". Unique per transaction, so it's the duplicate check. */
  code: string;
  type: TransactionType;
  /** Money moved, in cents. For expenses this includes the M-Pesa fee. */
  amountCents: number;
  /** The fee that's inside amountCents, in cents (0 when there is none). */
  feeCents: number;
  merchant: string | null;
  /** Paybill account number, when the message has one. */
  accountNumber: string | null;
  /** When it happened, as epoch milliseconds (UTC). */
  occurredAt: number;
};

export type ParseFailureReason = 'missing_code' | 'missing_date' | 'unrecognised';

export type ParseResult =
  | { ok: true; transaction: ParsedTransaction }
  | { ok: false; reason: ParseFailureReason };