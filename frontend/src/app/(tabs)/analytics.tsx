import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BarChart, CurveType, LineChart } from 'react-native-gifted-charts';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// import { CategoryList } from '@/components/analytics/category-list';
import { DonutChart, Slice } from '@/components/analytics/donut-chart';
import { SummaryGrid, SummaryItem } from '@/components/analytics/stat-summary';
import { Text } from '@/components/app-text';
import { DropdownPicker } from '@/components/shared/dropdown-picker';
import { Color } from '@/components/ui/color-pallete';
import { useAnalytics } from '@/hooks/use-analytics';
import { ANALYTICS_PERIODS, AnalyticsPeriod } from '@/lib/analytics/series';
import { formatKsh } from '@/lib/sms/money';
import { LinearGradient } from 'expo-linear-gradient';
const VIEWS = ['Income vs Expense', 'Income', 'Expense'] as const;

type ViewType = (typeof VIEWS)[number];

const VIEW_COLORS = {
  'Income vs Expense': {
    primary: Color.blue[500],
    light: Color.blue[50],
    text: Color.blue[700],
    background: [Color.blue[50], '#FFFFFF', '#FFFFFF'],
  },
  Income: {
    primary: Color.green[500],
    light: Color.green[50],
    text: Color.green[700],
    background: [Color.green[50], '#FFFFFF', '#FFFFFF'],
  },
  Expense: {
    primary: Color.red[500],
    light: Color.red[50],
    text: Color.red[700],
    background: [Color.red[50], '#FFFFFF', '#FFFFFF'],
  },
  // 'Category Spending': {
  //   primary: Color.purple[500],
  //   light: Color.purple[50],
  //   text: Color.purple[700],
  //   background: [Color.purple[50], '#FFFFFF', '#FFFFFF'],
  // },
} as const;

type MetricTheme = {
  primary: string;
  secondary: string;
  light: string;
  lighter: string;
  text: string;
};

const METRIC_COLORS: Record<'income' | 'expense' | 'both', MetricTheme> = {
  income: {
    primary: Color.green[500],
    secondary: Color.green[300],
    light: Color.green[100],
    lighter: Color.green[50],
    text: Color.green[700],
  },
  expense: {
    primary: Color.red[500],
    secondary: Color.red[300],
    light: Color.red[100],
    lighter: Color.red[50],
    text: Color.red[700],
  },
  both: {
    primary: Color.blue[600],
    secondary: Color.blue[400],
    light: Color.blue[100],
    lighter: Color.blue[50],
    text: Color.blue[700],
  },
};


const CHART_TYPES_BY_VIEW: Record<ViewType, string[]> = {
  'Income vs Expense': ['Bar Chart', 'Line Chart', 'Pie Chart'],
  Income: ['Bar Chart', 'Line Chart', 'Pie Chart'],
  Expense: ['Bar Chart', 'Line Chart', 'Pie Chart'],
  // 'Category Spending': ['Bar Chart', 'Pie Chart'],
};

// type Category = {
//   name: string;
//   short: string;
//   amount: number;
//   color: string;
// };

const compact = (value: number) =>
  value >= 1000 ? `${+(value / 1000).toFixed(1)}k` : String(value);

export default function AnalyticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [view, setView] = useState<ViewType>('Income vs Expense');
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [period, setPeriod] = useState<AnalyticsPeriod>('Monthly');
  const [chartType, setChartType] = useState('Bar Chart');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const theme = VIEW_COLORS[view];
  const data = useAnalytics(period);

  useEffect(() => {
    setSelectedIndex(null);
  }, [view, period, chartType]);

  // const isCategoryView = view === 'Category Spending';
  const isIncomeOnly = view === 'Income';
  const isExpenseOnly = view === 'Expense';

  const metric: 'income' | 'expense' | 'both' = isIncomeOnly
    ? 'income'
    : isExpenseOnly
      ? 'expense'
      : 'both';

  const colors = METRIC_COLORS[metric];

  const trend = useMemo(
    () =>
      (data?.points ?? []).map((point) => ({
        label: point.label,
        income: isExpenseOnly ? 0 : point.incomeCents / 100,
        expense: isIncomeOnly ? 0 : point.expenseCents / 100,
      })),
    [data, isIncomeOnly, isExpenseOnly]
  );

  const totals = data?.totals;
  const hasData =
    !!totals && (totals.incomeCents > 0 || totals.expenseCents > 0);

  // const categories = useMemo(
  //   () => [...CATEGORIES[period]].sort((a, b) => b.amount - a.amount),
  //   [period]
  // );

  // const categoryTotal = categories.reduce(
  //   (total, category) => total + category.amount,
  //   0
  // );

  const slices: Slice[] = isIncomeOnly
    ? [
        {
          label: 'Income',
          value: totals?.incomeCents ?? 0,
          color: METRIC_COLORS.income.primary,
        },
      ]
    : isExpenseOnly
      ? [
          {
            label: 'Expense',
            value: totals?.expenseCents ?? 0,
            color: METRIC_COLORS.expense.primary,
          },
        ]
      : [
          {
            label: 'Income',
            value: totals?.incomeCents ?? 0,
            color: METRIC_COLORS.income.primary,
          },
          {
            label: 'Expense',
            value: totals?.expenseCents ?? 0,
            color: METRIC_COLORS.expense.primary,
          },
        ];

  const chartWidth = width - 90;

  const barCommon = {
    width: chartWidth,
    height: 180,
    yAxisThickness: 0,
    xAxisColor: '#E5E3F0',
    rulesColor: '#EEECF6',
    yAxisLabelWidth: 38,
    yAxisTextStyle: { color: theme.text, fontSize: 10 },
    xAxisLabelTextStyle: {
      color: theme.text,
      fontSize: 10,
      textAlign: 'center' as const,
    },
    formatYLabel: (label: string) => compact(Number(label)),
    isAnimated: true,
    barBorderRadius: 4,
    initialSpacing: 6,
    endSpacing: 0,
  };

  function handleViewChange(nextView: ViewType) {
    setView(nextView);
    setViewPickerOpen(false);

    if (!CHART_TYPES_BY_VIEW[nextView].includes(chartType)) {
      setChartType('Bar Chart');
    }
  }

  function renderBars() {
    // if (isCategoryView) {
    //   const spacing = Math.max(
    //     8,
    //     Math.floor(chartWidth / categories.length) - 28
    //   );
    //
    //   return (
    //     <BarChart
    //       {...barCommon}
    //       data={categories.map((category) => ({
    //         value: category.amount,
    //         label: category.short,
    //         frontColor: category.color,
    //       }))}
    //       barWidth={50}
    //       spacing={spacing}
    //       showGradient
    //       gradientColor={gradientColor}
    //     />
    //   );
    // }

    const barWidth = 50

    const incomeValues = isExpenseOnly
      ? []
      : trend.map((point) => point.income);

    const expenseValues = isIncomeOnly
      ? []
      : trend.map((point) => point.expense);

    const visibleValues = [...incomeValues, ...expenseValues];

    const { maxValue, stepValue, noOfSections } =
      getChartScale(visibleValues);

    const chartData = trend.flatMap((point) => {
      const bars = [];

      if (!isExpenseOnly) {
        bars.push({
          value: point.income,
          frontColor: METRIC_COLORS.income.light,
          gradientColor: METRIC_COLORS.income.primary,
          spacing: isIncomeOnly ? 30 : 5,
          label: point.label,
          labelWidth: isIncomeOnly ? 40 : 80,
        });
      }

      if (!isIncomeOnly) {
        bars.push({
          value: point.expense,
          frontColor: METRIC_COLORS.expense.light,
          gradientColor: METRIC_COLORS.expense.primary,
          ...(isExpenseOnly ? { label: point.label, labelWidth: 40 } : {}),
          spacing: isIncomeOnly ? 15 : 25,
        });
      }

      return bars;
    });

    return (
      <BarChart
        {...barCommon}
        data={chartData}
        barWidth={barWidth}
        showGradient

        maxValue={maxValue}
        stepValue={stepValue}
        noOfSections={noOfSections}
      />
    );
  }

  // Calculates the scale of the charts based on available values
  function getChartScale(values: number[]) {
    const maxValue = Math.max(...values, 0);

    if (maxValue <= 0) {
      return { maxValue: 100, stepValue: 25, noOfSections: 4 };
    }

    const targetSteps = 4;
    const rawStep = maxValue / targetSteps;

    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const stepValue = Math.ceil(rawStep / magnitude) * magnitude;

    return {
      stepValue,
      noOfSections: targetSteps,
      maxValue: stepValue * targetSteps,
    };
  }

  function renderLines() {
    const points = trend.length;
    const edge = 12;
    const spacing =
      points > 1 ? (chartWidth - edge * 2) / (points - 1) : 0;

    const incomeData = trend.map((point) => ({
      value: point.income,
      label: point.label,
    }));

    const expenseData = trend.map((point) => ({
      value: point.expense,
      label: point.label,
    }));

    const isCombinedView = !isIncomeOnly && !isExpenseOnly;

    const visibleValues = isExpenseOnly
      ? expenseData.map((item) => item.value)
      : isIncomeOnly ?
        incomeData.map((item) => item.value)
      : [
          ...incomeData.map((item) => item.value),
          ...expenseData.map((item) => item.value),
      ];

    const { maxValue, stepValue, noOfSections } =
      getChartScale(visibleValues);

    return (
      <LineChart
        data={isExpenseOnly ? expenseData : incomeData}
        {...(isCombinedView ? { data2: expenseData } : {})}
        color1={
          isExpenseOnly
            ? METRIC_COLORS.expense.primary
            : METRIC_COLORS.income.primary
        }
        color2={
          isCombinedView
            ? METRIC_COLORS.expense.primary
            : METRIC_COLORS.income.primary
        }
        dataPointsColor1={
          isExpenseOnly
            ? METRIC_COLORS.expense.primary
            : METRIC_COLORS.income.primary
        }
        dataPointsColor2={
          isCombinedView
            ? METRIC_COLORS.expense.primary
            : METRIC_COLORS.income.primary
        }
        dataPointsRadius={points > 8 ? 2 : 4}
        width={chartWidth}
        height={180}
        curved
        curvature={0.1}
        curveType={CurveType.QUADRATIC}
        areaChart
        // isCombined == true
        startFillColor={
          isExpenseOnly
            ? METRIC_COLORS.expense.primary
            : METRIC_COLORS.income.primary
        }
        endFillColor={
          isExpenseOnly
            ? METRIC_COLORS.expense.light
            : METRIC_COLORS.income.light
        }
        startOpacity={0.28}
        endOpacity={0.02}

        // For combined view
        {...(isCombinedView
        ? {
            startFillColor2: METRIC_COLORS.expense.primary,
            endFillColor2: METRIC_COLORS.expense.light,
            startOpacity2: 0.28,
            endOpacity2: 0.02,
          }
        : {})}

        noOfSections={noOfSections}
        spacing={spacing}
        initialSpacing={edge}
        endSpacing={edge}
        maxValue={maxValue}
        stepValue={stepValue}
        overflowTop={10}

        yAxisThickness={0}
        xAxisColor="#E5E3F0"
        rulesColor="#EEECF6"
        yAxisLabelWidth={38}
        yAxisTextStyle={{ color: '#999999', fontSize: 10 }}
        xAxisLabelTextStyle={{
          color: '#999999',
          fontSize: 10,
          textAlign: 'center',
        }}
        formatYLabel={(label: string) => compact(Number(label))}
        isAnimated

        pointerConfig={{
          activatePointersOnLongPress: false,
          activatePointersImmediately: false,
          pointerLabelHeight: 90,
          pointerLabelWidth: 150,

          pointerLabelComponent: (items: any[]) => {
            const incomeItem = items[0];
            const expenseItem = isCombinedView ? items[1] : null;

            return (
              <View style={styles.pointerCard}>
                <Text style={styles.pointerLabel}>
                  {incomeItem?.label}
                </Text>

                {!isExpenseOnly && (
                  <View style={styles.pointerRow}>
                    <View
                      style={[
                        styles.pointerDot,
                        {
                          backgroundColor:
                            METRIC_COLORS.income.primary,
                        },
                      ]}
                    />
                    <Text style={styles.pointerText}>
                      Income: {formatKsh(incomeItem?.value ?? 0)}
                    </Text>
                  </View>
                )}

                {!isIncomeOnly && (
                  <View style={styles.pointerRow}>
                    <View
                      style={[
                        styles.pointerDot,
                        {
                          backgroundColor:
                            METRIC_COLORS.expense.primary,
                        },
                      ]}
                    />
                    <Text style={styles.pointerText}>
                      Expense:{' '}
                      {formatKsh(expenseItem?.value ?? 0)}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />
    );
  }

  const budget = data?.budget;

  const budgetValue = !budget
    ? '—'
    : budget.limitCents === null
      ? 'No limit set'
      : formatKsh(budget.spentCents);

  const summaryItems: SummaryItem[] = useMemo(() => {
    const income = formatKsh(totals?.incomeCents ?? 0);
    const expense = formatKsh(totals?.expenseCents ?? 0);
    const netFlowCents =
      (totals?.incomeCents ?? 0) - (totals?.expenseCents ?? 0);

    const netFlow = formatKsh(Math.abs(netFlowCents));
    const netFlowColor =
      netFlowCents >= 0
        ? METRIC_COLORS.income.primary
        : METRIC_COLORS.expense.primary;

    const netFlowTrend =
      netFlowCents > 0 ? 'up' : netFlowCents < 0 ? 'down' : 'neutral';

    const transactionCount = data?.totals?.transactionCount;
    const highestExpense = data?.totals?.highestExpenseCents;
    const highestSender = data?.totals?.highestSender;
    const highestReceiver = data?.totals?.highestReceiver;
    const smallCosts = data?.totals?.smallCostsCents;
    const incomeGrowth = data?.totals?.incomeGrowthPercent;
    const expenseGrowth = data?.totals?.expenseGrowthPercent;

    if (isIncomeOnly) {
      if (period === 'Weekly') {
        return [
          {
            label: 'Total income received',
            value: income,
            color: METRIC_COLORS.income.primary,
          },
          {
            label: 'Total transactions',
            value:
              transactionCount === undefined
                ? '—'
                : String(transactionCount),
          },
        ];
      }

      return [
        {
          label: 'Total income',
          value: income,
          color: METRIC_COLORS.income.primary,
        },
        {
          label: 'Total transactions',
          value:
            transactionCount === undefined ? '—' : String(transactionCount),
        },
        {
          label: 'Top income source',
          value: highestSender ?? '—',
        },
        {
          label:
            period === 'Yearly'
              ? 'Income growth vs last year'
              : 'Income growth vs last month',
          value:
            incomeGrowth === undefined
              ? '—'
              : `${incomeGrowth > 0 ? '+' : ''}${incomeGrowth}%`,
          color:
            incomeGrowth === undefined
              ? undefined
              : incomeGrowth >= 0
                ? METRIC_COLORS.income.primary
                : METRIC_COLORS.expense.primary,
          trend:
            incomeGrowth === undefined
              ? 'neutral'
              : incomeGrowth >= 0
                ? 'up'
                : 'down',
          trendColor:
            incomeGrowth === undefined
              ? undefined
              : incomeGrowth >= 0
                ? METRIC_COLORS.income.primary
                : METRIC_COLORS.expense.primary,
        },
      ];
    }

    if (isExpenseOnly) {
      if (period === 'Weekly') {
        return [
          {
            label: 'Total expenses',
            value: expense,
            color: METRIC_COLORS.expense.primary,
          },
          {
            label: 'Expense transactions',
            value:
              transactionCount === undefined
                ? '—'
                : String(transactionCount),
          },
          {
            label: 'Small costs under KSh 100',
            value:
              smallCosts === undefined ? '—' : formatKsh(smallCosts),
            color: METRIC_COLORS.expense.primary,
          },
        ];
      }

      return [
        {
          label: 'Total expenses',
          value: expense,
          color: METRIC_COLORS.expense.primary,
        },
        {
          label: 'Total transactions',
          value:
            transactionCount === undefined ? '—' : String(transactionCount),
        },
        {
          label: 'Top spending recipient',
          value: highestReceiver ?? '—',
        },
        {
          label:
            period === 'Yearly'
              ? 'Expense growth vs last year'
              : 'Expense growth vs last month',
          value:
            expenseGrowth === undefined
              ? '—'
              : `${expenseGrowth > 0 ? '+' : ''}${expenseGrowth}%`,
          color:
            expenseGrowth === undefined
              ? undefined
              : expenseGrowth >= 0
                ? METRIC_COLORS.expense.primary
                : METRIC_COLORS.income.primary,
          trend:
            expenseGrowth === undefined
              ? 'neutral'
              : expenseGrowth >= 0
                ? 'up'
                : 'down',
          trendColor:
            expenseGrowth === undefined
              ? undefined
              : expenseGrowth >= 0
                ? METRIC_COLORS.expense.primary
                : METRIC_COLORS.income.primary,
        },
      ];
    }

    const items: SummaryItem[] = [
      {
        label: 'Total income',
        value: income,
        color: METRIC_COLORS.income.primary,
      },
      {
        label: 'Total expenses',
        value: expense,
        color: METRIC_COLORS.expense.primary,
      },
      {
        label: 'Total transactions',
        value:
          transactionCount === undefined ? '—' : String(transactionCount),
      },
      {
        label: 'Net cash flow',
        value: netFlow,
        color: netFlowColor,
        trend: netFlowTrend,
        trendColor: netFlowColor,
      },
    ];

    if (period === 'Monthly' || period === 'Yearly') {
      items.push({
        label: 'Top income source',
        value: highestSender ?? '—',
      });

      items.push({
        label: 'Top spending recipient',
        value: highestReceiver ?? '—',
      });
    }

    return items;
  }, [
    data,
    totals,
    period,
    isIncomeOnly,
    isExpenseOnly,
  ]);
        

  return (
    <LinearGradient
      colors={theme.background}
      locations={[0, 0.4, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/home');
              }
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>

          <Text variant="heading" style={styles.title}>
            Activity
          </Text>

          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.chartCard}>
            <View style={styles.chartControlsRow}>
              <View style={{ position: 'relative', zIndex: 10 }}>
                <Pressable
                  onPress={() => setViewPickerOpen((previous) => !previous)}
                  style={styles.viewPicker}
                >
                  <Text
                    style={[styles.viewTrigger, { color: theme.text }]}
                  >
                    {view}
                  </Text>
                </Pressable>

                {viewPickerOpen && (
                  <View style={styles.viewDropdown}>
                    {VIEWS.map((option) => {
                      const optionTheme = VIEW_COLORS[option];
                      const isSelected = view === option;

                      return (
                        <Pressable
                          key={option}
                          onPress={() => handleViewChange(option)}
                          style={[
                            styles.viewOption,
                            isSelected && {
                              backgroundColor: optionTheme.light,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.optionDot,
                              { backgroundColor: optionTheme.primary },
                            ]}
                          />

                          <Text
                            style={[
                              styles.viewOptionText,
                              isSelected && {
                                color: optionTheme.text,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {option}
                          </Text>

                          {isSelected && (
                            <View
                              style={[
                                styles.checkmark,
                                { backgroundColor: optionTheme.primary },
                              ]}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.filterGroup}>
                <DropdownPicker
                  label="Period"
                  options={ANALYTICS_PERIODS}
                  selected={period}
                  onSelect={(value) => setPeriod(value as AnalyticsPeriod)}
                />

                <DropdownPicker
                  label="Chart Type"
                  options={CHART_TYPES_BY_VIEW[view]}
                  selected={chartType}
                  onSelect={setChartType}
                />
              </View>
            </View>

            <View style={styles.chartArea}>
              {data === null ? null : !hasData ? (
                <Text style={styles.empty}>
                  No data recorded in this period.
                </Text>
              ) : chartType === 'Pie Chart' ? (
                <DonutChart
                  key={`${view}-${period}`}
                  slices={slices}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                  formatAmount={formatKsh}
                />
              ) : chartType === 'Line Chart' ? (
                <View key={`${view}-${period}-lines`}>{renderLines()}</View>
              ) : (
                <View key={`${view}-${period}-bars`}>{renderBars()}</View>
              )}
            </View>

            <View style={styles.legend}>
              {!isExpenseOnly && (
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: METRIC_COLORS.income.primary },
                    ]}
                  />
                  <Text style={styles.legendText}>Income</Text>
                </View>
              )}

              {!isIncomeOnly && (
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: METRIC_COLORS.expense.primary },
                    ]}
                  />
                  <Text style={styles.legendText}>Expense</Text>
                </View>
              )}
            </View>
          </View>

          {/* {isCategoryView ? (
            <Animated.View key="list" entering={FadeInDown.duration(250)}>
              <CategoryList
                items={categories.map((category) => ({
                  name: category.name,
                  amount: category.amount,
                  color: category.color,
                }))}
                total={categoryTotal}
                selectedIndex={
                  chartType === 'Pie Chart' ? selectedIndex : null
                }
                formatAmount={formatKsh}
              />
            </Animated.View>
          ) : ( */}
          <Animated.View
            key={`${view}-${period}-summary`}
            entering={FadeInDown.duration(250)}
          >
            <SummaryGrid items={summaryItems} />
          </Animated.View>
          {/* )} */}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    color: '#1A1A1A',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  pointerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E3F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  pointerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  pointerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pointerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointerText: {
    fontSize: 11,
    color: '#444444',
  },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    minHeight: 370,
    // width: '105%',
    alignSelf: 'center',
  },
  chartControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 5,
  },
  chartArea: {
    flex: 1,
    minHeight: 180,
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#555555',
  },
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 5,
    width: '105%',
    alignSelf: 'center',
  },
  viewPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    minWidth: 140,
  },
  viewTrigger: {
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  viewDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E3F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  viewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  receivedLabel: {
    color: '#05092E',
  },
  receivedValue: {
    color: '#05092E',
    fontWeight: '800',
  },
  spentLabel: {
    color: '#482001',
  },
  spentValue: {
    color: '#482001',
    fontWeight: '800',
  },
  budgetLabel: {
    color: '#043404',
  },
  budgetValue: {
    color: '#043404',
    fontWeight: '800',
    marginTop: 18,
  },
  budgetProgressFill: {
    backgroundColor: '#1B6E3C',
  },
  goalsLabel: {
    color: '#0E0215',
  },
  goalsValue: {
    color: '#20062E',
    fontWeight: '800',
    marginTop: 18,
  },
  goalsProgressFill: {
    backgroundColor: '#6A1B9A',
  },
  empty: {
    textAlign: 'center',
    color: '#777777',
    fontSize: 14,
  },
});