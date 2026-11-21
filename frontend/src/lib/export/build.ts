// frontend/src/lib/export/build.ts
import type { StoredTransaction, Totals } from '../db/transactions';
import { centsToPlain, formatKsh } from '../sms/money';

export type ExportInput = {
  rows: StoredTransaction[]; // oldest first
  totals: Totals;
  periodLabel: string;
  exportedAt: string; // "YYYY-MM-DDTHH:mm"
};

const TYPE_LABEL = { income: 'Income', expense: 'Expense', savings: 'Savings' } as const;
const SIGN = { income: '+', expense: '-', savings: '' } as const;

// "2026-05-14T09:33" -> "2026-05-14 09:33", exactly as stored
const display = (stamp: string) => stamp.replace('T', ' ');

/* ----------------------------------- CSV ---------------------------------- */

function csvCell(value: string): string {
  // a leading = + - @ makes spreadsheets treat the cell as a formula
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildCsv({ rows }: ExportInput): string {
  const header = [
    'Date', 'Time', 'Type', 'Merchant', 'Account',
    'Amount (KSh)', 'Fee included (KSh)', 'Reference', 'Source',
  ];
  const lines = rows.map((r) =>
    [
      r.occurredAt.slice(0, 10),
      r.occurredAt.slice(11),
      TYPE_LABEL[r.type],
      r.merchant ?? '',
      r.accountNumber ?? '',
      centsToPlain(r.amountCents),
      centsToPlain(r.feeCents),
      r.code ?? '',
      r.source,
    ]
      .map(csvCell)
      .join(',')
  );
  // the BOM makes Excel read names with accents correctly
  return '\uFEFF' + [header.join(','), ...lines].join('\r\n') + '\r\n';
}

/* ----------------------------------- Text --------------------------------- */

export function buildText({ rows, totals, periodLabel, exportedAt }: ExportInput): string {
  const head = [
    'PesaBudge transactions',
    `Period: ${periodLabel}`,
    `Exported: ${display(exportedAt)}`,
    '',
    `Income:   ${formatKsh(totals.incomeCents)}`,
    `Expenses: ${formatKsh(totals.expenseCents)}`,
    `Savings:  ${formatKsh(totals.savingsCents)}`,
    '',
    '-'.repeat(60),
  ];
  const body = rows.map((r) => {
    const amount = `${SIGN[r.type]}${formatKsh(r.amountCents)}`;
    const who = (r.merchant ?? TYPE_LABEL[r.type]) + (r.accountNumber ? ` [${r.accountNumber}]` : '');
    return `${display(r.occurredAt)}  ${TYPE_LABEL[r.type].padEnd(8)} ${amount.padStart(16)}  ${who}`;
  });
  return [...head, ...body, ''].join('\n');
}

/* ------------------------------------ PDF --------------------------------- */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildHtml({ rows, totals, periodLabel, exportedAt }: ExportInput): string {
  const trs = rows
    .map((r) => {
      const sub = [r.code, r.accountNumber ? `Acct ${r.accountNumber}` : null].filter(Boolean).join(' · ');
      return `<tr>
        <td class="nowrap">${esc(display(r.occurredAt))}</td>
        <td>${TYPE_LABEL[r.type]}</td>
        <td>${esc(r.merchant ?? '')}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td>
        <td class="amt ${r.type}">${esc(SIGN[r.type] + formatKsh(r.amountCents))}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; font-size: 11px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #3f2fd6; }
    .meta { color: #666; margin-bottom: 16px; }
    .summary { display: flex; gap: 12px; margin-bottom: 18px; }
    .box { flex: 1; border: 1px solid #e5e3f0; border-radius: 8px; padding: 10px; }
    .box b { display: block; font-size: 14px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    th { text-align: left; background: #f1eeff; padding: 6px; }
    td { padding: 6px; border-bottom: 1px solid #eeecf6; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .nowrap { white-space: nowrap; }
    .sub { color: #888; font-size: 9px; margin-top: 2px; }
    .amt { text-align: right; white-space: nowrap; font-weight: 600; }
    .income { color: #1fa64a; } .expense { color: #d6393f; }
    .foot { margin-top: 16px; color: #999; font-size: 9px; }
  </style></head><body>
    <h1>PesaBudge transactions</h1>
    <div class="meta">${esc(periodLabel)} · exported ${esc(display(exportedAt))}</div>
    <div class="summary">
      <div class="box">Income<b>${esc(formatKsh(totals.incomeCents))}</b></div>
      <div class="box">Expenses<b>${esc(formatKsh(totals.expenseCents))}</b></div>
      <div class="box">Savings<b>${esc(formatKsh(totals.savingsCents))}</b></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Details</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${trs}</tbody>
    </table>
    <div class="foot">Expense amounts include M-Pesa transaction fees.</div>
  </body></html>`;
}