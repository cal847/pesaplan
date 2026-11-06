// frontend/src/lib/sms/parse-mpesa.test.ts
import { formatKsh, kshToCents } from './money';
import { parseMpesaSms } from './parse-mpesa';
import type { ParsedTransaction } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const at = (y: number, mo: number, d: number, h: number, min: number) =>
  `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(min)}`;

function parseOk(message: string): ParsedTransaction {
  const result = parseMpesaSms(message);
  if (!result.ok) throw new Error(`expected a parse, got: ${result.reason}`);
  return result.transaction;
}

const TILL =
  'UEEMG49UN7 Confirmed. Ksh30.00 paid to SHOPPERS DELIGHT MINIMART. on 14/5/26 at 9:33 AM.New M-PESA balance is Ksh522.30. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,970.00. Save frequent Tills for quick payment on M-PESA app https://bit.ly/mpesalnk';

const TILL_STRAY_ZERO =
  'UEDMG46AWV Confirmed. Ksh75.00 paid to MARTIN MBUGUA MUCHOKI 0. on 13/5/26 at 12:39 PM.New M-PESA balance is Ksh269.30. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,925.00. Save frequent Tills for quick payment on M-PESA app https://bit.ly/mpesalnk';

const RECEIVED_MASKED =
  'UED8043803 Confirmed.You have received Ksh600.00 from VERONICA  WAMBUI 0720***011 on 13/5/26 at 2:38 PM  New M-PESA balance is Ksh612.30. To view the Full Number, forward this message to 334.';

const RECEIVED_NO_NUMBER =
  'UEBMG3ZOLE Confirmed. You have received Ksh500.00 from KENYMAK AGENCIES B2C on 11/5/26 at 6:41 PM. New M-PESA balance is Ksh1,286.30. Separate personal and business funds through Pochi la Biashara on *334#.';

const SENT_PERSON =
  'UEDMG46B9U Confirmed. Ksh250.00 sent to Joseph  Ndungu 0113817677 on 13/5/26 at 12:59 PM. New M-PESA balance is Ksh12.30. Transaction cost, Ksh7.00.  Amount you can transact within the day is 499,675.00. Earn interest daily on Ziidi MMF,Dial *334#';

const PAYBILL =
  'UEBMG40PXB Confirmed. Ksh50.00 sent to KPLC PREPAID for account 22170621225 on 11/5/26 at 8:55 PM New M-PESA balance is Ksh1,136.30. Transaction cost, Ksh0.00.Amount you can transact within the day is 499,735.00. Save frequent paybills for quick payment on M-PESA app https://bit.ly/mpesalnk';

const DATA_BUNDLE =
  'UECMG411OQ Confirmed. Ksh30.00 sent to SAFARICOM DATA BUNDLES for account SAFARICOM DATA BUNDLES on 12/5/26 at 5:15 AM. New M-PESA balance is Ksh1,106.30. Transaction cost, Ksh0.00.';

const MSHWARI =
  'UECMG41CQD Confirmed.Ksh500.00 transferred to M-Shwari account on 12/5/26 at 8:30 AM. M-PESA balance is Ksh551.30 .New M-Shwari saving account balance is Ksh564.02. Transaction cost Ksh.0.00';

const AIRTIME =
  'UEBMG3WUXX confirmed.You bought Ksh10.00 of airtime on 11/5/26 at 4:59 AM.New M-PESA balance is Ksh591.30. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,990.00. Start Investing today with Ziidi MMF & earn daily. Dial *334#.';

describe('parseMpesaSms', () => {
  it('parses a till payment', () => {
    expect(parseOk(TILL)).toEqual({
      code: 'UEEMG49UN7',
      type: 'expense',
      amountCents: 3000,
      feeCents: 0,
      merchant: 'SHOPPERS DELIGHT MINIMART',
      accountNumber: null,
      occurredAt: at(2026, 5, 14, 9, 33),
    });
  });

  it('strips the stray "0" Safaricom adds to some till names', () => {
    const tx = parseOk(TILL_STRAY_ZERO);
    expect(tx.merchant).toBe('MARTIN MBUGUA MUCHOKI');
    expect(tx.occurredAt).toBe(at(2026, 5, 13, 12, 39));
  });

  it('parses money received when the sender number is masked', () => {
    expect(parseOk(RECEIVED_MASKED)).toEqual({
      code: 'UED8043803',
      type: 'income',
      amountCents: 60000,
      feeCents: 0,
      merchant: 'VERONICA WAMBUI',
      accountNumber: null,
      occurredAt: at(2026, 5, 13, 14, 38),
    });
  });

  it('parses money received when there is no sender number at all', () => {
    const tx = parseOk(RECEIVED_NO_NUMBER);
    expect(tx.type).toBe('income');
    expect(tx.merchant).toBe('KENYMAK AGENCIES B2C');
    expect(tx.amountCents).toBe(50000);
  });

  it('adds the fee to a person-to-person send and keeps it separately too', () => {
    expect(parseOk(SENT_PERSON)).toEqual({
      code: 'UEDMG46B9U',
      type: 'expense',
      amountCents: 25700, // 250.00 + 7.00 fee
      feeCents: 700,
      merchant: 'Joseph Ndungu',
      accountNumber: null,
      occurredAt: at(2026, 5, 13, 12, 59),
    });
  });

  it('treats a paybill as a paybill, with its account number', () => {
    const tx = parseOk(PAYBILL);
    expect(tx.merchant).toBe('KPLC PREPAID');
    expect(tx.accountNumber).toBe('22170621225');
    expect(tx.amountCents).toBe(5000);
  });

  it('drops the account number when it only repeats the merchant (data bundles)', () => {
    const tx = parseOk(DATA_BUNDLE);
    expect(tx.merchant).toBe('SAFARICOM DATA BUNDLES');
    expect(tx.accountNumber).toBeNull();
  });

  it('records M-Shwari transfers as savings with no merchant', () => {
    expect(parseOk(MSHWARI)).toEqual({
      code: 'UECMG41CQD',
      type: 'savings',
      amountCents: 50000,
      feeCents: 0,
      merchant: null,
      accountNumber: null,
      occurredAt: at(2026, 5, 12, 8, 30),
    });
  });

  it('parses airtime, even though "confirmed" is lowercase there', () => {
    const tx = parseOk(AIRTIME);
    expect(tx.type).toBe('expense');
    expect(tx.merchant).toBe('Safaricom');
    expect(tx.amountCents).toBe(1000);
    expect(tx.occurredAt).toBe(at(2026, 5, 11, 4, 59));
  });
});

describe('parseMpesaSms failures', () => {
  it('rejects text that is not an M-Pesa message', () => {
    expect(parseMpesaSms('Hello, are we still meeting at 5?')).toEqual({
      ok: false,
      reason: 'missing_code',
    });
    expect(parseMpesaSms('')).toEqual({ ok: false, reason: 'missing_code' });
  });

  it('rejects a confirmed message with no date', () => {
    expect(
      parseMpesaSms('UEEMG49UN7 Confirmed. Ksh30.00 paid to SHOP. New M-PESA balance is Ksh1.00')
    ).toEqual({ ok: false, reason: 'missing_date' });
  });

  it('rejects a date that does not exist', () => {
    expect(
      parseMpesaSms('UEBMG3WUXX confirmed.You bought Ksh10.00 of airtime on 31/2/26 at 4:59 AM.')
    ).toEqual({ ok: false, reason: 'missing_date' });
  });

  it('says "unrecognised" for a message type it does not know yet', () => {
    expect(
      parseMpesaSms('UEBMG3ZOLE Confirmed. Fuliza M-PESA amount is Ksh100.00 on 11/5/26 at 6:41 PM.')
    ).toEqual({ ok: false, reason: 'unrecognised' });
  });
});

describe('12-hour clock edges', () => {
  const airtime = (time: string) =>
    `UEBMG3WUXX confirmed.You bought Ksh10.00 of airtime on 1/2/26 at ${time}.New M-PESA balance is Ksh1.00.`;

  it('reads 12 AM as midnight and 12 PM as noon', () => {
    expect(parseOk(airtime('12:30 AM')).occurredAt).toBe(at(2026, 2, 1, 0, 30));
    expect(parseOk(airtime('12:30 PM')).occurredAt).toBe(at(2026, 2, 1, 12, 30));
    expect(parseOk(airtime('11:59 PM')).occurredAt).toBe(at(2026, 2, 1, 23, 59));
  });
});

describe('money helpers', () => {
  it.each<[string, number]>([
    ['30', 3000],
    ['30.5', 3050],
    ['0.05', 5],
    ['1,051.30', 105130],
    ['499,970.00', 49997000],
  ])('kshToCents(%s)', (text, cents) => {
    expect(kshToCents(text)).toBe(cents);
  });

  it('formats cents for display', () => {
    expect(formatKsh(2132449)).toBe('Ksh 21,324.49');
  });
});