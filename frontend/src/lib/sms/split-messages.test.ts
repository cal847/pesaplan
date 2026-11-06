import { splitMessages } from './split-messages';

const A = 'UEEMG49UN7 Confirmed. Ksh30.00 paid to SHOP. on 14/5/26 at 9:33 AM.';
const B = 'UED8043803 Confirmed.You have received Ksh600.00 from X on 13/5/26 at 2:38 PM';
const C = 'UEBMG3WUXX confirmed.You bought Ksh10.00 of airtime on 11/5/26 at 4:59 AM.';

describe('splitMessages', () => {
  it('splits messages pasted one per line', () => {
    expect(splitMessages(`${A}\n${B}\n`)).toEqual([A, B]);
  });
  it('splits messages run together with no line breaks', () => {
    expect(splitMessages(`${A} ${B} ${C}`)).toEqual([A, B, C]);
  });
  it('handles the lowercase "confirmed" used in airtime messages', () => {
    expect(splitMessages(C)).toEqual([C]);
  });
  it('returns nothing for blank text, and unrelated text as one chunk', () => {
    expect(splitMessages('   \n ')).toEqual([]);
    expect(splitMessages('hello there')).toEqual(['hello there']);
  });
});