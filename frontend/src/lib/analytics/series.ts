import type { DailyTotals } from '../db/transactions';
import type { SpendingPeriod } from '../period';
import { toLocalStamp } from '../time';

export type AnalyticsPeriod = Exclude<SpendingPeriod, 'Daily'>;
export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ['Weekly', 'Monthly', 'Yearly'];

export type SeriesPoint = { label: string; incomeCents: number; expenseCents: number };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const pad = (n: number) => String(n).padStart(2, '0');

type Plan = { labels: string[]; bucketOf: (day: string) => number | null };

// Says which chart bar a "YYYY-MM-DD" belongs to, or null if it's outside the period.
function planFor(period: AnalyticsPeriod, now: Date): Plan {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  if (period === 'Weekly') {
    const sinceMonday = (now.getDay() + 6) % 7;
    const days = WEEKDAYS.map((_, i) =>
      toLocalStamp(new Date(y, m, d - sinceMonday + i)).slice(0, 10)
    );
    return {
      labels: WEEKDAYS,
      bucketOf: (day) => {
        const i = days.indexOf(day);
        return i === -1 ? null : i;
      },
    };
  }

  if (period === 'Monthly') {
    // W1 is days 1-7, W2 is 8-14, and so on. A 31-day month has a short W5.
    const weeks = Math.ceil(new Date(y, m + 1, 0).getDate() / 7);
    const prefix = `${y}-${pad(m + 1)}-`;
    return {
      labels: Array.from({ length: weeks }, (_, i) => `W${i + 1}`),
      bucketOf: (day) =>
        day.startsWith(prefix) ? Math.floor((Number(day.slice(8, 10)) - 1) / 7) : null,
    };
  }

  const prefix = `${y}-`;
  return {
    labels: MONTH_LETTERS,
    bucketOf: (day) => (day.startsWith(prefix) ? Number(day.slice(5, 7)) - 1 : null),
  };
}

export function buildSeries(
  period: AnalyticsPeriod,
  rows: DailyTotals[],
  now = new Date()
): SeriesPoint[] {
  const { labels, bucketOf } = planFor(period, now);
  const points = labels.map((label) => ({ label, incomeCents: 0, expenseCents: 0 }));

  for (const row of rows) {
    const i = bucketOf(row.day);
    if (i === null || i < 0 || i >= points.length) continue; // outside this period
    points[i].incomeCents += row.incomeCents;
    points[i].expenseCents += row.expenseCents;
  }
  return points;
}