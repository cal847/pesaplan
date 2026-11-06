// frontend/src/lib/sms/parse-mpesa.ts
import { kshToCents } from './money';
import type { ParseFailureReason, ParseResult, TransactionType } from './types';

// Kenya is UTC+3 all year (no daylight saving). M-Pesa prints local time, so we
// convert explicitly and don't depend on the phone's timezone setting.
const EAT_OFFSET_HOURS = 3;

// Pieces shared by several patterns
const AMOUNT = String.raw`Ksh\.?\s?([\d,]+(?:\.\d{1,2})?)`; // "Ksh30.00", "Ksh1,051.30", "Ksh.0.00"
const ON_DATE = String.raw`\s+on\s+\d{1,2}/\d{1,2}/\d{2,4}`; // marks where a name ends

const CODE = /^([A-Z0-9]{10})\s+[Cc]onfirmed/; // also tells us it's a confirmed M-Pesa message
const DATE = /\bon (\d{1,2})\/(\d{1,2})\/(\d{2,4}) at (\d{1,2}):(\d{2})\s?([AP]M)/i;
const FEE = new RegExp(String.raw`Transaction cost,?\s+${AMOUNT}`, 'i');

type Draft = {
  type: TransactionType;
  amount: string; // as printed, e.g. "1,200.00"
  merchant: string | null;
  accountNumber?: string | null;
};

type Rule = { pattern: RegExp; draft: (m: RegExpExecArray) => Draft };

// First rule that matches wins
const RULES: Rule[] = [
  // Money moved into M-Shwari savings
  {
    pattern: new RegExp(String.raw`${AMOUNT} transferred to M-Shwari`, 'i'),
    draft: (m) => ({ type: 'savings', amount: m[1], merchant: null }),
  },
  // Money received. The sender's number is optional (it may be masked, or missing for B2C)
  {
    pattern: new RegExp(
      String.raw`You have received ${AMOUNT} from (.+?)(?:\s+[\d*+]{6,})?${ON_DATE}`,
      'i'
    ),
    draft: (m) => ({ type: 'income', amount: m[1], merchant: cleanName(m[2]) }),
  },
  // Paybill. This must come BEFORE "sent to a person": both start with "sent to"
  {
    pattern: new RegExp(String.raw`${AMOUNT} sent to (.+?) for account (.+?)${ON_DATE}`, 'i'),
    draft: (m) => {
      const merchant = cleanName(m[2]);
      const account = m[3].trim();
      return {
        type: 'expense',
        amount: m[1],
        merchant,
        // Data bundles repeat the merchant name as the "account", which isn't useful
        accountNumber: account.toLowerCase() === merchant.toLowerCase() ? null : account,
      };
    },
  },
  // Sent to a person
  {
    pattern: new RegExp(
      String.raw`${AMOUNT} sent to (.+?)(?:\s+[\d*+]{6,})?${ON_DATE}`,
      'i'
    ),
    draft: (m) => ({ type: 'expense', amount: m[1], merchant: cleanName(m[2]) }),
  },
  // Till / business payment
  {
    pattern: new RegExp(String.raw`${AMOUNT} paid to (.+?)\.?${ON_DATE}`, 'i'),
    draft: (m) => ({ type: 'expense', amount: m[1], merchant: cleanName(m[2]) }),
  },
  // Airtime
  {
    pattern: new RegExp(String.raw`You bought ${AMOUNT} of airtime`, 'i'),
    draft: (m) => ({ type: 'expense', amount: m[1], merchant: 'Safaricom' }),
  },
];

function cleanName(name: string): string {
  // Safaricom sometimes adds a stray "0" to till names, e.g. "MARTIN MBUGUA MUCHOKI 0"
  return name.replace(/\s+0+$/, '').trim();
}

const pad = (n: number) => String(n).padStart(2, '0')

function parseDate(text: string): number | null {
  const m = DATE.exec(text);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  if (hour12 < 1 || hour12 > 12 || minute > 59) return null;

  // Reject dates that don't exist (31/2)
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;

  let hour = hour12 % 12; // 12 AM is midnight
  if (m[6].toUpperCase() === 'PM') hour += 12;

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

const fail = (reason: ParseFailureReason): ParseResult => ({ ok: false, reason });

/** Turns one M-Pesa confirmation SMS into a transaction, or says why it couldn't. */
export function parseMpesaSms(raw: string): ParseResult {
  // One space between words, whatever the SMS had ("VERONICA  WAMBUI" -> "VERONICA WAMBUI")
  const text = raw.replace(/\s+/g, ' ').trim();

  const code = CODE.exec(text)?.[1];
  if (!code) return fail('missing_code');

  const occurredAt = parseDate(text);
  if (occurredAt === null) return fail('missing_date');

  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;

    const draft = rule.draft(match);
    const feeMatch = FEE.exec(text);
    // Only money going out carries a fee that counts against the user
    const feeCents = draft.type === 'expense' && feeMatch ? kshToCents(feeMatch[1]) : 0;
    const amountCents = kshToCents(draft.amount) + feeCents;
    if (amountCents <= 0) return fail('unrecognised');
    return {
      ok: true,
      transaction: {
        code,
        type: draft.type,
        amountCents: amountCents,
        feeCents,
        merchant: draft.merchant,
        accountNumber: draft.accountNumber ?? null,
        occurredAt,
      },
    };
  }

  return fail('unrecognised');
}