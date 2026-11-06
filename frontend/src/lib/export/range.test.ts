import { exportRange } from './range';

describe('exportRange', () => {
  it('"last month" in January is last December', () => {
    expect(exportRange('Last month', new Date(2026, 0, 15))).toEqual({
      from: '2025-12-01T00:00',
      to: '2026-01-01T00:00',
      label: '1 Dec 2025 – 31 Dec 2025',
    });
  });
  it('"last 3 months" is this month and the two before', () => {
    expect(exportRange('Last 3 months', new Date(2026, 4, 14))).toEqual({
      from: '2026-03-01T00:00',
      to: '2026-06-01T00:00',
      label: '1 Mar 2026 – 31 May 2026',
    });
  });
  it('"all time" sorts before and after any stamp', () => {
    const r = exportRange('All time');
    expect('2026-05-14T09:33' >= r.from && '2026-05-14T09:33' < r.to).toBe(true);
  });
});