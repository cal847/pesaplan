import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { DateRange } from '@/components/ui/period-filters';
import {
  AnalyticsPeriod,
  buildSeries,
  SeriesPoint,
} from '@/lib/analytics/series';
import { getDb } from '@/lib/db/database';
import {
  AnalyticsTotals,
  analyticsTotalsBetween,
  dailyTotalsBetween,
  Totals,
  totalsBetween,
} from '@/lib/db/transactions';
import { periodBounds } from '@/lib/period';
import { useDataStore } from '@/stores/data-store';
import { useSettingsStore } from '@/stores/settings-store';

export type AnalyticsData = {
  points: SeriesPoint[];
  totals: AnalyticsTotals;
  previousTotals: Totals;
  budget: {
    spentCents: number;
    limitCents: number | null;
    percent: number | null;
  };
};

function growthPercent(
  currentCents: number,
  previousCents: number
): number | null {
  if (previousCents <= 0) {
    return currentCents > 0 ? 100 : null;
  }

  return Math.round(
    ((currentCents - previousCents) / previousCents) * 100 * 100
  ) / 100;
}

function previousDateRange(range: DateRange): DateRange {
  const from = new Date(range.from);
  const to = new Date(range.to);

  const durationMs = to.getTime() - from.getTime();

  const previousFrom = new Date(from.getTime() - durationMs);
  const previousTo = new Date(from.getTime());

  return {
    from: previousFrom.toISOString(),
    to: previousTo.toISOString(),
  };
}

function resolveSeriesPeriod(range: DateRange): AnalyticsPeriod {
  const from = new Date(range.from);
  const to = new Date(range.to);

  const durationDays =
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

  if (durationDays <= 31) {
    return 'Monthly';
  }

  return 'Yearly';
}

// Null until the first load finishes.
export function useAnalytics(
  range: DateRange,
  seriesPeriod?: AnalyticsPeriod
): AnalyticsData | null {
  const spendingPeriod = useSettingsStore((s) => s.spendingPeriod);
  const limitCents = useSettingsStore((s) => s.spendingLimitCents);
  const dataVersion = useDataStore((s) => s.version);
  const simKey = useSettingsStore((s) => s.activeSim);

  const [data, setData] = useState<AnalyticsData | null>(null);

  const loadData = useCallback(async () => {
    const db = await getDb();

    const previousRange = previousDateRange(range);
    const budgetRange = periodBounds(spendingPeriod);

    const [daily, totals, previousTotals, budgetTotals] =
      await Promise.all([
        dailyTotalsBetween(
          db,
          range.from,
          range.to,
          simKey
        ),
        analyticsTotalsBetween(
          db,
          range.from,
          range.to,
          simKey
        ),
        totalsBetween(
          db,
          previousRange.from,
          previousRange.to,
          simKey
        ),
        totalsBetween(
          db,
          budgetRange.from,
          budgetRange.to,
          simKey
        ),
      ]);

    const incomeGrowthPercent = growthPercent(
      totals.incomeCents,
      previousTotals.incomeCents
    );

    const expenseGrowthPercent = growthPercent(
      totals.expenseCents,
      previousTotals.expenseCents
    );

    const spentCents = budgetTotals.expenseCents;

    setData({
      points: buildSeries(
        seriesPeriod ?? resolveSeriesPeriod(range),
        daily
      ),
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
  }, [range, seriesPeriod, simKey, spendingPeriod, limitCents]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      loadData()
        .catch((error) => {
          console.warn('analytics load failed', error);
        });

      return () => {
        cancelled = true;
      };
    }, [loadData])
  );

  return data;
}