import { toLocalStamp } from '../time';

export const EXPORT_PERIODS = ['This month', 'Last month', 'Last 3 months', 'This year', 'All time'] as const;
export type ExportPeriod = (typeof EXPORT_PERIODS)[number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// [start, end) for each period. "Last 3 months" means this month and the two before it.
const BOUNDS: Record<Exclude<ExportPeriod, 'All time'>, (y: number, m: number) => [Date, Date]> = {
  'This month': (y, m) => [new Date(y, m, 1), new Date(y, m + 1, 1)],
  'Last month': (y, m) => [new Date(y, m - 1, 1), new Date(y, m, 1)],
  'Last 3 months': (y, m) => [new Date(y, m - 2, 1), new Date(y, m + 1, 1)],
  'This year': (y) => [new Date(y, 0, 1), new Date(y + 1, 0, 1)],
};

export function exportRange(period: ExportPeriod, now = new Date()) {
  if (period === 'All time') {
    return { from: '0000-01-01T00:00', to: '9999-12-31T23:59', label: 'All time' };
  }
  const [start, end] = BOUNDS[period](now.getFullYear(), now.getMonth());
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  return { from: toLocalStamp(start), to: toLocalStamp(end), label: `${fmt(start)} – ${fmt(lastDay)}` };
}