import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AnalyticsPeriod, buildSeries, SeriesPoint } from '@/lib/analytics/series';
import { getDb } from '@/lib/db/database';
import { dailyTotalsBetween, totalsBetween, Totals } from '@/lib/db/transactions';
import { periodBounds } from '@/lib/period';
import { useSettingsStore } from '@/stores/settings-store';

export type AnalyticsData = {
  points: SeriesPoint[]; // chart bars
  totals: Totals; // for the selected period
  budget: { spentCents: number; limitCents: number | null; percent: number | null };
};

// Null until the first load finishes.
export function useAnalytics(period: AnalyticsPeriod): AnalyticsData | null {
  const spendingPeriod = useSettingsStore((s) => s.spendingPeriod);
  const limitCents = useSettingsStore((s) => s.spendingLimitCents);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const db = await getDb();
        const range = periodBounds(period);
        const budgetRange = periodBounds(spendingPeriod); // the budget has its own period
        const [daily, totals, budgetTotals] = await Promise.all([
          dailyTotalsBetween(db, range.from, range.to),
          totalsBetween(db, range.from, range.to),
          totalsBetween(db, budgetRange.from, budgetRange.to),
        ]);
        if (cancelled) return;

        const spentCents = budgetTotals.expenseCents;
        setData({
          points: buildSeries(period, daily),
          totals,
          budget: {
            spentCents,
            limitCents,
            percent: limitCents && limitCents > 0 ? Math.round((spentCents / limitCents) * 100) : null,
          },
        });
      })().catch((e) => console.warn('analytics load failed', e));

      return () => {
        cancelled = true;
      };
    }, [period, spendingPeriod, limitCents])
  );

  return data;
}