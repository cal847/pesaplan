import { formatPhone, toDialable } from './donate';

it('formats local and international numbers', () => {
  expect(formatPhone('0712345678')).toBe('0712 345 678');
  expect(formatPhone('+254712345678')).toBe('+254 712 345 678');
});
it('copies digits only, keeping a leading +', () => {
  expect(toDialable('0712 345-678')).toBe('0712345678');
  expect(toDialable('+254 712 345 678')).toBe('+254712345678');
});
it('leaves other formats unchanged', () => {
  expect(formatPhone('Till 123456')).toBe('Till 123456');
});