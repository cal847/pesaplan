import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MIN_YEAR = 1900;
const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_HEIGHT = WHEEL_ITEM_HEIGHT * 5;
// Fixed body height so the sheet never jumps between calendar and wheel
const BODY_HEIGHT = 300;

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatSelectedDate(date: Date | null) {
  if (!date) return 'Select';
  const month = MONTHS[date.getMonth()].slice(0, 3);
  return `${month} ${date.getDate()}`;
}

/* ------------------------------ Wheel column ------------------------------ */

type WheelItem = { value: number; label: string };

type WheelColumnProps = {
  accessibilityLabel: string;
  items: WheelItem[];
  selectedValue: number;
  onSelect: (value: number) => void;
};

function WheelColumn({
  accessibilityLabel,
  items,
  selectedValue,
  onSelect,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === selectedValue)
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * WHEEL_ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex, items.length]);

  return (
    <View style={styles.wheelColumn}>
      <ScrollView
        ref={scrollRef}
        accessibilityLabel={accessibilityLabel}
        decelerationRate="fast"
        snapToInterval={WHEEL_ITEM_HEIGHT}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wheelScrollContent}
        onMomentumScrollEnd={({ nativeEvent }) => {
          const index = Math.min(
            items.length - 1,
            Math.max(0, Math.round(nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT))
          );
          const item = items[index];
          if (item && item.value !== selectedValue) onSelect(item.value);
        }}
      >
        {items.map((item, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={item.value}
              // Tap any item to jump straight to it
              onPress={() => {
                scrollRef.current?.scrollTo({
                  y: index * WHEEL_ITEM_HEIGHT,
                  animated: true,
                });
                if (item.value !== selectedValue) onSelect(item.value);
              }}
              style={styles.wheelItem}
            >
              <Text
                numberOfLines={1}
                style={[styles.wheelItemText, selected && styles.wheelItemTextSelected]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* --------------------------------- Picker --------------------------------- */

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
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelDate, setWheelDate] = useState(() => new Date());

  // Keep the Modal mounted until the exit animation finishes
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(
        0,
        { duration: 180, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return;
    setFromDate(initialRange?.from ?? null);
    setToDate(initialRange?.to ?? null);
    const initialDate = initialRange?.from ?? new Date();
    setCalendarMonth(initialDate);
    setWheelDate(initialDate);
    setWheelOpen(false);
    setSelection('from');
  }, [visible, initialRange]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [28, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
    ],
  }));

  const today = new Date();
  const todayKey = dateKey(today);
  const currentYear = today.getFullYear();
  const minimumWheelDate = selection === 'to' ? fromDate : null;
  const minimumWheelDateKey = minimumWheelDate ? dateKey(minimumWheelDate) : null;
  const wheelYear = wheelDate.getFullYear();
  const wheelMonth = wheelDate.getMonth();

  const yearItems = useMemo(() => {
    const firstYear = Math.max(MIN_YEAR, minimumWheelDate?.getFullYear() ?? MIN_YEAR);
    return Array.from(
      { length: Math.max(0, currentYear - firstYear + 1) },
      (_, index) => {
        const year = firstYear + index;
        return { value: year, label: String(year) };
      }
    );
  }, [currentYear, minimumWheelDate]);

  const monthItems = useMemo(
    () =>
      MONTHS.map((label, value) => ({ value, label })).filter(({ value }) => {
        const firstDay = new Date(wheelYear, value, 1);
        const lastDay = new Date(wheelYear, value + 1, 0);
        return (
          (!minimumWheelDateKey || dateKey(lastDay) >= minimumWheelDateKey) &&
          dateKey(firstDay) <= todayKey
        );
      }),
    [minimumWheelDateKey, todayKey, wheelYear]
  );

  const dayItems = useMemo(() => {
    const daysInMonth = new Date(wheelYear, wheelMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => index + 1)
      .filter((day) => {
        const key = dateKey(new Date(wheelYear, wheelMonth, day));
        return (!minimumWheelDateKey || key >= minimumWheelDateKey) && key <= todayKey;
      })
      .map((day) => ({ value: day, label: String(day) }));
  }, [minimumWheelDateKey, todayKey, wheelMonth, wheelYear]);

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
    fromDate !== null && toDate !== null && dateKey(toDate) >= dateKey(fromDate);

  function activeDateFor(part: Selection) {
    return part === 'from'
      ? fromDate ?? calendarMonth
      : toDate ?? fromDate ?? calendarMonth;
  }

  function openWheelPicker() {
    setWheelDate(activeDateFor(selection));
    setWheelOpen(true);
  }

  function changeWheelDate(part: 'day' | 'month' | 'year', value: number) {
    setWheelDate((current) => {
      const year = part === 'year' ? value : current.getFullYear();
      const month = part === 'month' ? value : current.getMonth();
      const day =
        part === 'day'
          ? value
          : Math.min(current.getDate(), new Date(year, month + 1, 0).getDate());
      let next = new Date(year, month, day);

      if (dateKey(next) > todayKey) {
        next = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      }
      if (minimumWheelDate && dateKey(next) < dateKey(minimumWheelDate)) {
        next = new Date(
          minimumWheelDate.getFullYear(),
          minimumWheelDate.getMonth(),
          minimumWheelDate.getDate()
        );
      }
      return next;
    });
  }

  function applyWheelDate() {
    if (dateKey(wheelDate) > todayKey) return;

    if (selection === 'from') {
      setFromDate(wheelDate);
      setToDate(null);
      setSelection('to');
    } else if (fromDate && dateKey(wheelDate) >= dateKey(fromDate)) {
      setToDate(wheelDate);
    }

    setCalendarMonth(wheelDate);
    setWheelOpen(false);
  }

  function chooseDate(date: Date) {
    if (dateKey(date) > todayKey) return;

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
    setCalendarMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + amount, 1);
      if (next.getFullYear() < MIN_YEAR || dateKey(next) > todayKey) return current;
      return next;
    });
  }

  const isCurrentMonth =
    calendarMonth.getFullYear() === today.getFullYear() &&
    calendarMonth.getMonth() === today.getMonth();
  const isFirstMonth =
    calendarMonth.getFullYear() === MIN_YEAR && calendarMonth.getMonth() === 0;

  if (!mounted) return null;

  const headerDate = wheelOpen ? wheelDate : calendarMonth;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        {/* Blurred, dimmed backdrop: the sheet is the only thing in focus */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={45}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView" // needed for Android
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dim} />
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close date range picker"
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />

        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* From / To selector */}
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
                  onPress={() => {
                    setSelection(part);
                    if (wheelOpen) setWheelDate(activeDateFor(part));
                  }}
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

          {/* Month header */}
          <View style={styles.monthHeader}>
            <View style={styles.sideSlot}>
              {!wheelOpen && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  accessibilityState={{ disabled: isFirstMonth }}
                  disabled={isFirstMonth}
                  hitSlop={6}
                  onPress={() => shiftMonth(-1)}
                  style={[styles.monthButton, isFirstMonth && styles.monthButtonDisabled]}
                >
                  <Ionicons name="chevron-back" size={18} color="#40336F" />
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                wheelOpen ? 'Close date wheel' : 'Choose date by day, month, and year'
              }
              accessibilityState={{ expanded: wheelOpen }}
              onPress={() => (wheelOpen ? setWheelOpen(false) : openWheelPicker())}
              style={[styles.monthTitleButton, wheelOpen && styles.monthTitleButtonActive]}
            >
              <Text variant="heading" style={styles.monthTitle}>
                {MONTHS[headerDate.getMonth()]} {headerDate.getFullYear()}
              </Text>
              <Ionicons
                name={wheelOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#5D3BC8"
              />
            </Pressable>

            <View style={styles.sideSlot}>
              {!wheelOpen && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  accessibilityState={{ disabled: isCurrentMonth }}
                  disabled={isCurrentMonth}
                  hitSlop={6}
                  onPress={() => shiftMonth(1)}
                  style={[styles.monthButton, isCurrentMonth && styles.monthButtonDisabled]}
                >
                  <Ionicons name="chevron-forward" size={18} color="#40336F" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Body: calendar underneath, wheel slides over it */}
          <View style={styles.body}>
            <View>
              <View style={styles.weekdays}>
                {WEEKDAYS.map((day, index) => (
                  <Text key={`${day}-${index}`} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }

                  const key = dateKey(date);
                  const fromKey = fromDate ? dateKey(fromDate) : null;
                  const toKey = toDate ? dateKey(toDate) : null;
                  const selected = key === fromKey || key === toKey;
                  const inRange = !!fromKey && !!toKey && key > fromKey && key < toKey;
                  const isStart = !!toKey && key === fromKey && toKey !== fromKey;
                  const isEnd = !!fromKey && key === toKey && toKey !== fromKey;
                  const isToday = key === todayKey;
                  const isFuture = key > todayKey;
                  const disabled =
                    isFuture || (selection === 'to' && !!fromKey && key < fromKey);

                  return (
                    <View key={key} style={[styles.dayCell, inRange && styles.dayInRange]}>
                      {/* half-bands connect the endpoints to the range */}
                      {isStart && <View style={[styles.rangeCap, styles.rangeCapStart]} />}
                      {isEnd && <View style={[styles.rangeCap, styles.rangeCapEnd]} />}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}
                        accessibilityState={{ selected, disabled }}
                        disabled={disabled}
                        onPress={() => chooseDate(date)}
                        style={[
                          styles.dayButton,
                          isToday && !selected && styles.dayToday,
                          selected && styles.daySelected,
                        ]}
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
            </View>

            {wheelOpen && (
              <Animated.View
                entering={FadeInDown.duration(240).easing(Easing.out(Easing.cubic))}
                exiting={FadeOutDown.duration(160)}
                style={styles.wheelPicker}
              >
                <Text style={styles.wheelHeading}>
                  Choose {selection === 'from' ? 'start' : 'end'} date
                </Text>
                <View style={styles.wheelLabels}>
                  <Text style={styles.wheelLabel}>Day</Text>
                  <Text style={styles.wheelLabel}>Month</Text>
                  <Text style={styles.wheelLabel}>Year</Text>
                </View>
                <View style={styles.wheelRow}>
                  <WheelColumn
                    accessibilityLabel="Day"
                    items={dayItems}
                    selectedValue={wheelDate.getDate()}
                    onSelect={(value) => changeWheelDate('day', value)}
                  />
                  <WheelColumn
                    accessibilityLabel="Month"
                    items={monthItems}
                    selectedValue={wheelDate.getMonth()}
                    onSelect={(value) => changeWheelDate('month', value)}
                  />
                  <WheelColumn
                    accessibilityLabel="Year"
                    items={yearItems}
                    selectedValue={wheelDate.getFullYear()}
                    onSelect={(value) => changeWheelDate('year', value)}
                  />
                  <View pointerEvents="none" style={styles.wheelSelectedBand} />
                </View>
                <View style={styles.wheelActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setWheelOpen(false)}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonLabel}>Back to calendar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={applyWheelDate}
                    style={styles.wheelApplyButton}
                  >
                    <Text style={styles.wheelApplyText}>Use date</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.textButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!validRange || wheelOpen}
              onPress={() =>
                validRange && !wheelOpen && onDone({ from: fromDate, to: toDate })
              }
              style={[
                styles.doneButton,
                (!validRange || wheelOpen) && styles.doneButtonDisabled,
              ]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 8, 24, 0.35)',
  },
  sheet: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 20px 50px rgba(14, 10, 40, 0.3)',
  },

  rangeSelector: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    gap: 8,
    padding: 5,
    borderRadius: 30,
    backgroundColor: '#F0EEF4',
  },
  rangeOption: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  rangeOptionActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 2px 8px rgba(38, 29, 66, 0.14)',
  },
  rangeOptionDisabled: { opacity: 0.45 },
  rangeLabel: { fontWeight: '700', color: '#777382', fontSize: 13 },
  rangeLabelActive: { color: '#5A3BC4' },
  rangeValue: { marginTop: 2, color: '#777382', fontSize: 13 },
  rangeValueActive: { color: '#231D35', fontWeight: '600' },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  sideSlot: { width: 40, alignItems: 'center' },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2EFFA',
  },
  monthButtonDisabled: { opacity: 0.35 },
  monthTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  monthTitleButtonActive: { backgroundColor: '#F2EFFA' },
  monthTitle: { color: '#211D2C', fontSize: 17, textAlign: 'center' },

  body: { height: BODY_HEIGHT },

  weekdays: { flexDirection: 'row', marginBottom: 6 },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    fontWeight: '500',
    color: '#777382',
    fontSize: 12,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInRange: { backgroundColor: '#EEE9FF' },
  rangeCap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#EEE9FF',
  },
  rangeCapStart: { left: '50%', right: 0 },
  rangeCapEnd: { left: 0, right: '50%' },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderWidth: 1.5, borderColor: '#5D3BC8' },
  daySelected: { backgroundColor: '#5D3BC8' },
  dayText: { color: '#24212B', fontSize: 14, fontWeight: '500' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  dayTextDisabled: { color: '#B8B5BF' },

  wheelPicker: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  wheelHeading: {
    color: '#777382',
    fontSize: 13,
    textAlign: 'center',
  },
  wheelLabels: { flexDirection: 'row' },
  wheelLabel: {
    flex: 1,
    color: '#777382',
    fontSize: 12,
    textAlign: 'center',
  },
  wheelRow: {
    height: WHEEL_VISIBLE_HEIGHT,
    flexDirection: 'row',
  },
  wheelColumn: {
    flex: 1,
    height: WHEEL_VISIBLE_HEIGHT,
    overflow: 'hidden',
  },
  wheelScrollContent: { paddingVertical: WHEEL_ITEM_HEIGHT * 2 },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemText: { color: '#9A96A5', fontSize: 15 },
  wheelItemTextSelected: { color: '#5D3BC8', fontSize: 18, fontWeight: '700' },
  wheelSelectedBand: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: 'rgba(93, 59, 200, 0.07)',
  },
  wheelActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wheelApplyButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#5D3BC8',
  },
  wheelApplyText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textButtonLabel: { color: '#5D3BC8', fontSize: 13, fontWeight: '600' },
  cancelText: { color: '#777382', fontSize: 14, fontWeight: '600' },
  doneButton: {
    height: 46,
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
    backgroundColor: '#5D3BC8',
  },
  doneButtonDisabled: { opacity: 0.42 },
  doneText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});