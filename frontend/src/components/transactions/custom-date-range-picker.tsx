import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';

export type SelectedDateRange = {
  from: Date;
  to: Date;
};

type Props = {
  visible: boolean;
  initialRange: SelectedDateRange | null;
  onCancel: () => void;
  onDone: (range: SelectedDateRange) => void;
};

type Selection = 'from' | 'to';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatSelectedDate(date: Date | null) {
  if (!date) return 'Choose date';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function CustomDateRangePicker({
  visible,
  initialRange,
  onCancel,
  onDone,
}: Props) {
  const [selection, setSelection] = useState<Selection>('from');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  useEffect(() => {
    if (!visible) return;
    setFromDate(initialRange?.from ?? null);
    setToDate(initialRange?.to ?? null);
    setCalendarMonth(initialRange?.from ?? new Date());
    setSelection('from');
  }, [visible, initialRange]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      return day < 1 || day > daysInMonth ? null : new Date(year, month, day);
    });
  }, [calendarMonth]);

  const validRange =
    fromDate !== null &&
    toDate !== null &&
    dateKey(toDate) >= dateKey(fromDate);

  function chooseDate(date: Date) {
    if (selection === 'from') {
      setFromDate(date);
      setToDate(null);
      setSelection('to');
      return;
    }

    if (fromDate && dateKey(date) >= dateKey(fromDate)) {
      setToDate(date);
    }
  }

  function shiftMonth(amount: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close date range picker"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.rangeSelector}>
            {(['from', 'to'] as const).map((part) => {
              const active = selection === part;
              const disabled = part === 'to' && !fromDate;
              const value = part === 'from' ? fromDate : toDate;
              return (
                <Pressable
                  key={part}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}
                  disabled={disabled}
                  onPress={() => setSelection(part)}
                  style={[
                    styles.rangeOption,
                    active && styles.rangeOptionActive,
                    disabled && styles.rangeOptionDisabled,
                  ]}
                >
                  <Text style={[styles.rangeLabel, active && styles.rangeLabelActive]}>
                    {part === 'from' ? 'From' : 'To'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.rangeValue, active && styles.rangeValueActive]}
                  >
                    {formatSelectedDate(value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.weekdays}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.monthHeader}>
            <Text variant="heading" style={styles.monthTitle}>
              {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </Text>
            <View style={styles.monthControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => shiftMonth(-1)}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-back" size={18} color="#40336F" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => shiftMonth(1)}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-forward" size={18} color="#40336F" />
              </Pressable>
            </View>
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;

              const key = dateKey(date);
              const fromKey = fromDate ? dateKey(fromDate) : null;
              const toKey = toDate ? dateKey(toDate) : null;
              const selected = key === fromKey || key === toKey;
              const inRange = !!fromKey && !!toKey && key > fromKey && key < toKey;
              const disabled =
                selection === 'to' && !!fromKey && key < fromKey;

              return (
                <View
                  key={key}
                  style={[
                    styles.dayCell,
                    inRange && styles.dayInRange,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    onPress={() => chooseDate(date)}
                    style={[styles.dayButton, selected && styles.daySelected]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {selection === 'to' && (
            <Pressable
              accessibilityRole="button"
              disabled={!validRange}
              onPress={() => validRange && onDone({ from: fromDate, to: toDate })}
              style={[styles.doneButton, !validRange && styles.doneButtonDisabled]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(10, 8, 24, 0.38)',
  },
  sheet: {
    width: '100%',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 16px 40px rgba(14, 10, 40, 0.2)',
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEDCE5',
    marginBottom: 16,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    borderRadius: 18,
    backgroundColor: '#F0EEF4',
    marginBottom: 20,
  },
  rangeOption: {
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  rangeOptionActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 2px 8px rgba(38, 29, 66, 0.14)',
  },
  rangeOptionDisabled: {
    opacity: 0.45,
  },
  rangeLabel: {
    fontWeight: '500',
    color: '#777382',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  rangeLabelActive: {
    color: '#5A3BC4',
  },
  rangeValue: {
    marginTop: 3,
    color: '#777382',
    fontSize: 12,
  },
  rangeValueActive: {
    color: '#231D35',
    fontWeight: '600',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    fontWeight: '500',
    color: '#777382',
    fontSize: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthTitle: {
    color: '#211D2C',
    fontSize: 16,
  },
  monthControls: {
    flexDirection: 'row',
    gap: 4,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2EFFA',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInRange: {
    backgroundColor: '#EEE9FF',
  },
  daySelected: {
    borderRadius: 21,
    backgroundColor: '#5D3BC8',
  },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: '#24212B',
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#AAA7B1',
    textDecorationLine: 'line-through',
  },
  doneButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: '#5D3BC8',
  },
  doneButtonDisabled: {
    opacity: 0.42,
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
