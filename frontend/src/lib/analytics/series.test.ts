import { buildSeries } from './series';

const day = (d: string, incomeCents = 0, expenseCents = 0) => ({ day: d, incomeCents, expenseCents });
const thursday = new Date(2026, 4, 14, 12, 0); // Thu 14 May 2026

describe('buildSeries', () => {
  it('weekly: Monday to Sunday, ignoring days outside the week', () => {
    const points = buildSeries(
      'Weekly',
      [day('2026-05-11', 100000), day('2026-05-13', 0, 50000), day('2026-05-18', 999, 999)],
      thursday
    );
    expect(points.map((p) => p.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(points[0].incomeCents).toBe(100000);
    expect(points[2].expenseCents).toBe(50000);
    expect(points[6]).toEqual({ label: 'Sun', incomeCents: 0, expenseCents: 0 });
  });

  it('monthly: groups days into weeks of seven, with a short last week', () => {
    const points = buildSeries(
      'Monthly',
      [day('2026-05-07', 0, 100), day('2026-05-08', 0, 200), day('2026-05-29', 0, 300), day('2026-04-30', 0, 999)],
      thursday
    );
    expect(points.map((p) => p.label)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5']);
    expect(points[0].expenseCents).toBe(100);
    expect(points[1].expenseCents).toBe(200);
    expect(points[4].expenseCents).toBe(300);
  });

  it('monthly: February has four weeks', () => {
    expect(buildSeries('Monthly', [], new Date(2026, 1, 10))).toHaveLength(4);
  });

  it('yearly: twelve months, ignoring other years', () => {
    const points = buildSeries(
      'Yearly',
      [day('2026-01-15', 500), day('2026-12-31', 0, 700), day('2025-12-31', 999, 999)],
      thursday
    );
    expect(points).toHaveLength(12);
    expect(points[0].incomeCents).toBe(500);
    expect(points[11].expenseCents).toBe(700);
  });
});