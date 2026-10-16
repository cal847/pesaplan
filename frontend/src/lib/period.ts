// frontend/src/lib/period.ts
import { toLocalStamp } from './time';

export type SpendingPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export const PERIOD_CAPTION: Record<SpendingPeriod, string> = {
  Daily: 'today',
  Weekly: 'this week',
  Monthly: 'this month',
  Yearly: 'this year',
};

/** The current period as [from, to) stamps. Weeks start on Monday. */
export function periodBounds(period: SpendingPeriod, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  let start: Date;
  let end: Date;

  switch (period) {
    case 'Daily':
      start = new Date(y, m, d);
      end = new Date(y, m, d + 1);
      break;
    case 'Weekly': {
      const sinceMonday = (now.getDay() + 6) % 7;
      start = new Date(y, m, d - sinceMonday);
      end = new Date(y, m, d - sinceMonday + 7);
      break;
    }
    case 'Monthly':
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 1); // December rolls over to January by itself
      break;
    case 'Yearly':
      start = new Date(y, 0, 1);
      end = new Date(y + 1, 0, 1);
      break;
  }
  return { from: toLocalStamp(start), to: toLocalStamp(end) };
}