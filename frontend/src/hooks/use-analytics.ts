import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AnalyticsPeriod, buildSeries, SeriesPoint } from '@/lib/analytics/series';
import { getDb } from '@/lib/db/database';
import { AnalyticsTotals, analyticsTotalsBetween, dailyTotalsBetween, Totals, totalsBetween } from '@/lib/db/transactions';
import { periodBounds, previousPeriodBounds } from '@/lib/period';
import { useDataStore } from '@/stores/data-store';
import { useSettingsStore } from '@/stores/settings-store';

export type AnalyticsData = {
  points: SeriesPoint[];
  totals: AnalyticsTotals;
  previousTotals: Totals;
  budget: {
    spentCents: number;
    limitCents: number | null;
    percent: number | null
  };
};

// Null until the first load finishes.
export function useAnalytics(period: AnalyticsPeriod): AnalyticsData | null {
  const spendingPeriod = useSettingsStore((s) => s.spendingPeriod);
  const limitCents = useSettingsStore((s) => s.spendingLimitCents);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const dataVersion = useDataStore((s) => s.version);
  const simKey = useSettingsStore((s) => s.activeSim);

  function growthPercent(currentCents: number, previousCents: number) {
    if (previousCents <= 0) {
      return currentCents > 0 ? 100 : null;
    }

    return Math.round(
      ((currentCents - previousCents) / previousCents) * 100 * 100
    )/100;
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const db = await getDb();
        const range = periodBounds(period);
        const budgetRange = periodBounds(spendingPeriod);
        const previousRange = previousPeriodBounds(period);
        const [daily, totals, previousTotals, budgetTotals] = await Promise.all([
          dailyTotalsBetween(db, range.from, range.to, simKey),
          analyticsTotalsBetween(db, range.from, range.to, simKey),
          totalsBetween(db, previousRange.from, previousRange.to, simKey),
          totalsBetween(db, budgetRange.from, budgetRange.to, simKey),
        ]);
        const incomeGrowthPercent = growthPercent(totals.incomeCents, previousTotals.incomeCents);
        const expenseGrowthPercent = growthPercent(totals.expenseCents, previousTotals.expenseCents);
        
        if (cancelled) return;

        const spentCents = budgetTotals.expenseCents;
        setData({
          points: buildSeries(period, daily),
          totals: {
            ...totals,
            incomeGrowthPercent,
            expenseGrowthPercent,
          },
          previousTotals,
          budget: {
            spentCents,
            limitCents,
            percent:
              limitCents && limitCents > 0
                ? Math.round((spentCents / limitCents) * 100)
                : null,
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