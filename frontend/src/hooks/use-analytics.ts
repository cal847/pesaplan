import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AnalyticsPeriod, buildSeries, SeriesPoint } from '@/lib/analytics/series';
import { getDb } from '@/lib/db/database';
import { dailyTotalsBetween, Totals, totalsBetween } from '@/lib/db/transactions';
import { periodBounds } from '@/lib/period';
import { useDataStore } from '@/stores/data-store';
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
  const dataVersion = useDataStore((s) => s.version);
  const simKey = useSettingsStore((s) => s.activeSim);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const db = await getDb();
        const range = periodBounds(period);
        const budgetRange = periodBounds(spendingPeriod); // the budget has its own period
        const [daily, totals, budgetTotals] = await Promise.all([
          dailyTotalsBetween(db, range.from, range.to, simKey),
          totalsBetween(db, range.from, range.to, simKey),
          totalsBetween(db, budgetRange.from, budgetRange.to, simKey),
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
    }, [period, spendingPeriod, limitCents, dataVersion, simKey])
  );

  return data;
}