import type { StoredTransaction } from '../db/transactions';
import { buildCsv, buildHtml, buildText } from './build';

const row = (over: Partial<StoredTransaction> = {}): StoredTransaction => ({
  id: '1', code: 'UEEMG49UN7', type: 'expense', amountCents: 3000, feeCents: 0,
  merchant: 'SHOP', accountNumber: null, categoryId: null,
  occurredAt: '2026-05-14T09:33', source: 'sms', createdAt: 0, ...over,
});
const input = (rows: StoredTransaction[]) => ({
  rows,
  totals: { incomeCents: 100000, expenseCents: 25700, savingsCents: 50000 },
  periodLabel: '1 May 2026 – 31 May 2026',
  exportedAt: '2026-05-14T10:00',
});

describe('buildCsv', () => {
  it('writes plain decimal amounts and splits date and time', () => {
    const csv = buildCsv(input([row({ amountCents: 25700, feeCents: 700 })]));
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('2026-05-14,09:33,Expense,SHOP,,257.00,7.00,UEEMG49UN7,sms');
  });
  it('quotes commas and quotes, and defuses leading formula characters', () => {
    const csv = buildCsv(input([
      row({ merchant: 'ACME, "LTD"' }),
      row({ id: '2', merchant: '=SUM(A1)' }),
    ]));
    expect(csv).toContain('"ACME, ""LTD"""');
    expect(csv).toContain("'=SUM(A1)");
  });
});

describe('buildText and buildHtml', () => {
  it('shows the totals and signed amounts', () => {
    const text = buildText(input([row({ type: 'income', amountCents: 60000, merchant: 'VERONICA WAMBUI' })]));
    expect(text).toContain('Income:   Ksh 1,000.00');
    expect(text).toContain('+Ksh 600.00');
  });
  it('escapes HTML in merchant names', () => {
    const html = buildHtml(input([row({ merchant: '<b>X</b> & Co' })]));
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt; &amp; Co');
    expect(html).not.toContain('<b>X</b>');
  });
});