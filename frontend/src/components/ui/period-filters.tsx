import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/app-text';
import {
  CustomDateRangePicker,
  type SelectedDateRange,
} from '@/components/transactions/custom-date-range-picker';
import { periodBounds } from '@/lib/period';
import { toLocalStamp } from '@/lib/time';

const FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Choose Range' },
] as const;

export type PeriodFilterId = (typeof FILTERS)[number]['id'];

export type DateRange = {
  from: string;
  to: string;
};

type Props = {
  selectedFilter: PeriodFilterId;
  onRangeChange: (range: DateRange) => void;
  onFilterChange: (filter: PeriodFilterId) => void;
  hiddenFilters?: PeriodFilterId[];

  containerStyle?: object;
  activeBackgroundColor?: string;
  activeTextColor?: string;
  inactiveBackgroundColor?: string;
  inactiveTextColor?: string;
};

export const ALL_TIME_RANGE: DateRange = {
  from: '1970-01-01T00:00:00',
  to: '9999-12-31T23:59:59',
};

export function PeriodFilters({
  selectedFilter,
  onRangeChange,
  onFilterChange,
  hiddenFilters = [],
  containerStyle,
  activeBackgroundColor = '#5D3BC8',
  activeTextColor = '#FFFFFF',
  inactiveBackgroundColor = '#EAE5F8',
  inactiveTextColor = '#4F35AE',
}: Props) {
  // const [filter, setFilter] = useState<PeriodFilterId>(initialFilter);
  const filter = selectedFilter;
  const [customRange, setCustomRange] =
    useState<SelectedDateRange | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);

  const range = useMemo<DateRange>(() => {
    if (filter === 'all') {
      return ALL_TIME_RANGE;
    }

    if (filter === 'today') {
      return periodBounds('Daily');
    }

    if (filter === 'week') {
      return periodBounds('Weekly');
    }

    if (filter === 'month') {
      return periodBounds('Monthly');
    }

    if (filter === 'year') {
      return periodBounds('Yearly');
    }

    if (filter === 'custom' && customRange) {
      const from = new Date(
        customRange.from.getFullYear(),
        customRange.from.getMonth(),
        customRange.from.getDate()
      );

      const to = new Date(
        customRange.to.getFullYear(),
        customRange.to.getMonth(),
        customRange.to.getDate() + 1
      );

      return {
        from: toLocalStamp(from),
        to: toLocalStamp(to),
      };
    }

    return ALL_TIME_RANGE;
  }, [filter, customRange]);

  useEffect(() => {
    onRangeChange(range);
    }, [onRangeChange, range]);

//   const emitRange = useCallback(
//     (nextRange: DateRange) => {
//       onRangeChange(nextRange);
//     },
//     [onRangeChange]
//   );

//   useEffect(() => {
//     emitRange(range);
//   }, [emitRange, range]);

    

  const handleSelect = useCallback(
    (nextFilter: PeriodFilterId) => {
      if (nextFilter === 'custom') {
        setRangePickerOpen(true);
        return;
      }

      // Tapping the active pill returns to All Time.
      onFilterChange(
      selectedFilter === nextFilter ? 'all' : nextFilter
    );
  },
  [onFilterChange, selectedFilter]
  );

  return (
    <>
        {FILTERS.filter((item) => !hiddenFilters.includes(item.id)).map((item) => {
            const isActive = filter === item.id;

            return (
            <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => handleSelect(item.id)}
                style={[
                styles.filterPill,
                {
                    backgroundColor: isActive
                    ? activeBackgroundColor
                    : inactiveBackgroundColor,
                },
                ]}
            >
                <Text
                style={[
                    styles.filterText,
                    {
                    color: isActive
                        ? activeTextColor
                        : inactiveTextColor,
                    },
                ]}
                >
                {item.label}
                </Text>
            </Pressable>
            );
        })}

      <CustomDateRangePicker
        visible={rangePickerOpen}
        initialRange={customRange}
        onCancel={() => setRangePickerOpen(false)}
        onDone={(selectedRange) => {
          setCustomRange(selectedRange);
          onFilterChange('custom');
          setRangePickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  filters: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 18,
  },
  filterText: {
    fontWeight: '500',
    fontSize: 11,
  },
});