// frontend/src/lib/sms/inbox.test.ts
import { defaultSimLabel, RawSms, simKeyFor, toCandidates } from './inbox';

const SENT =
  'SGH1234567 Confirmed. Ksh100.00 sent to JANE DOE 0712345678 on 14/5/26 at 9:33 AM. New M-PESA balance is Ksh500.00. Transaction cost, Ksh0.00.';
const RECEIVED =
  'SGH1234567 Confirmed. You have received Ksh100.00 from JOHN DOE 0722***111 on 14/5/26 at 9:33 AM. New M-PESA balance is Ksh900.00.';
const FULIZA = 'UEBMG3ZOLE Confirmed. Fuliza M-PESA amount is Ksh100.00 on 11/5/26 at 6:41 PM.';

const row = (over: Partial<RawSms>): RawSms => ({
  id: 1, address: 'MPESA', body: SENT, date: 1000, subscriptionId: 3, slot: 0, ...over,
});

describe('toCandidates', () => {
  it('keeps both halves of a transfer between your own SIMs', () => {
    const { candidates, sims } = toCandidates([
      row({ id: 1, body: SENT, subscriptionId: 3, slot: 0 }),
      row({ id: 2, body: RECEIVED, subscriptionId: 5, slot: 1 }),
    ]);
    expect(candidates.map((c) => [c.parsed.code, c.parsed.type, c.simKey])).toEqual([
      ['SGH1234567', 'expense', 'sub:3'],
      ['SGH1234567', 'income', 'sub:5'],
    ]);
    expect([...sims]).toEqual([['sub:3', 0], ['sub:5', 1]]);
  });

  it('treats an unknown SIM as no SIM at all', () => {
    const { candidates, sims } = toCandidates([row({ subscriptionId: -1, slot: -1 })]);
    expect(candidates[0].simKey).toBe('');
    expect(sims.size).toBe(0);
  });

  it('remembers a SIM whose slot is unknown', () => {
    expect([...toCandidates([row({ subscriptionId: 7, slot: -1 })]).sims]).toEqual([['sub:7', null]]);
  });

  it('counts unreadable M-Pesa messages, ignores other texts, and still moves the marker forward', () => {
    const result = toCandidates([
      row({ body: FULIZA, date: 2000 }),
      row({ body: 'Are we still meeting at 5?', date: 3000 }),
    ]);
    expect(result.candidates).toHaveLength(0);
    expect(result.unreadable).toBe(1);
    expect(result.newest).toBe(3000);
  });
});

it('names SIMs by slot', () => {
  expect(simKeyFor(4)).toBe('sub:4');
  expect(simKeyFor(-1)).toBe('');
  expect(defaultSimLabel(0)).toBe('SIM 1');
  expect(defaultSimLabel(1)).toBe('SIM 2');
  expect(defaultSimLabel(null)).toBe('SIM');
});