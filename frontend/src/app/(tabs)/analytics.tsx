import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DropdownPicker } from '@/components/shared/dropdown-picker';
import { StatCard } from '@/components/analytics/stat-card';
import { DonutChart, Slice } from '@/components/analytics/donut-chart';
import { CategoryList } from '@/components/analytics/category-list';
import { useAnalytics } from '@/hooks/use-analytics';
import { ANALYTICS_PERIODS, AnalyticsPeriod } from '@/lib/analytics/series';
import { formatKsh } from '@/lib/sms/money';
import { useSettingsStore } from '@/stores/settings-store';

const VIEWS = ['Income vs Expense'/*'Category Spending'*/];
const CHART_TYPES_BY_VIEW: Record<string, string[]> = {
  'Income vs Expense': ['Bar Chart', 'Line Chart', 'Pie Chart'],
  'Category Spending': ['Bar Chart', 'Pie Chart'],
};

// Match the bright cyan and amber used by the income and expense stat cards.
const INCOME_COLOR = '#3FBCE3';
const EXPENSE_COLOR = '#F8B64D';

// Colors for Pie Chart in income_vs_expense
const INCOME_COLOR_2 = '#1038bc';
const EXPENSE_COLOR_2 = '#c9170e';

type Category = { name: string; short: string; amount: number; color: string };

const CATEGORIES: Record<string, Category[]> = {
  Weekly: [
    { name: 'Food', short: 'Food', amount: 2400, color: '#6D4FF2' },
    { name: 'Transport', short: 'Transp.', amount: 1500, color: '#4FA8F2' },
    { name: 'Shopping', short: 'Shop', amount: 1350, color: '#C98DE8' },
    { name: 'Utilities', short: 'Utils', amount: 950, color: '#58D68D' },
    { name: 'Other', short: 'Other', amount: 800, color: '#B0B0C0' },
    { name: 'Subscriptions', short: 'Subs', amount: 650, color: '#F2C14E' },
  ],
  Monthly: [
    { name: 'Rent', short: 'Rent', amount: 15000, color: '#F2735A' },
    { name: 'Food', short: 'Food', amount: 7500, color: '#6D4FF2' },
    { name: 'Transport', short: 'Transp.', amount: 3800, color: '#4FA8F2' },
    { name: 'Utilities', short: 'Utils', amount: 2600, color: '#58D68D' },
    { name: 'Shopping', short: 'Shop', amount: 2100, color: '#C98DE8' },
    { name: 'Subscriptions', short: 'Subs', amount: 1900, color: '#F2C14E' },
  ],
  Yearly: [
    { name: 'Rent', short: 'Rent', amount: 300000, color: '#F2735A' },
    { name: 'Food', short: 'Food', amount: 150000, color: '#6D4FF2' },
    { name: 'Shopping', short: 'Shop', amount: 79000, color: '#C98DE8' },
    { name: 'Transport', short: 'Transp.', amount: 70000, color: '#4FA8F2' },
    { name: 'Utilities', short: 'Utils', amount: 55000, color: '#58D68D' },
    { name: 'Subscriptions', short: 'Subs', amount: 40000, color: '#F2C14E' },
  ],
};

const compact = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n));

export default function AnalyticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [view, setView] = useState(VIEWS[0]);
  const [period, setPeriod] = useState('Monthly');
  const [chartType, setChartType] = useState('Bar Chart');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const data = useAnalytics(period);
  const spendingPeriod = useSettingsStore((s) => s.spendingPeriod);

  useEffect(() => setSelectedIndex(null), [view, period, chartType]);

  const isCategoryView = view === 'Category Spending';
  const trend = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        label: p.label,
        income: p.incomeCents / 100,
        expense: p.expenseCents / 100,
      })),
    [data]
  );

  const totals = data?.totals;
  const hasData = !!totals && (totals.incomeCents > 0 || totals.expenseCents > 0);

  const categories = useMemo(
    () => [...CATEGORIES[period]].sort((a, b) => b.amount - a.amount),
    [period]
  );
  const categoryTotal = categories.reduce((s, c) => s + c.amount, 0);

  const slices: Slice[] = isCategoryView
    ? categories.map((c) => ({ label: c.name, value: c.amount, color: c.color }))
    : [
        { label: 'Income', value: totals?.incomeCents ?? 0, color: INCOME_COLOR_2 },
        { label: 'Expense', value: totals?.expenseCents ?? 0, color: EXPENSE_COLOR_2 },
      ];

  const chartWidth = width - 90;

  const barCommon = {
    width: chartWidth,
    height: 180,
    noOfSections: 4,
    yAxisThickness: 0,
    xAxisColor: '#E5E3F0',
    rulesColor: '#EEECF6',
    yAxisLabelWidth: 38,
    yAxisTextStyle: { color: '#999', fontSize: 10 },
    xAxisLabelTextStyle: { color: '#999', fontSize: 10, textAlign: 'center' as const },
    formatYLabel: (label: string) => compact(Number(label)),
    disableScroll: true,
    isAnimated: true,
    barBorderRadius: 4,
    initialSpacing: 6,
    endSpacing: 0,
  };

  function handleViewChange(next: string) {
    setView(next);
    if (!CHART_TYPES_BY_VIEW[next].includes(chartType)) {
      setChartType('Bar Chart');
    }
  }

  function renderBars() {
    if (isCategoryView) {
      const spacing = Math.max(8, Math.floor(chartWidth / categories.length) - 28);
      return (
        <BarChart
          {...barCommon}
          data={categories.map((c) => ({
            value: c.amount,
            label: c.short,
            frontColor: c.color,
          }))}
          barWidth={28}
          spacing={spacing}
        />
      );
    }
    
    const unit = chartWidth / trend.length;

    // Allows bar width to adjust as periods get longer
    const barWidth = Math.max(5, Math.min(15, Math.floor(unit * 0.3)));
    const innerGap = 2;
    const groupGap = Math.max(4, unit - 2 * barWidth - innerGap);

    const data = trend.flatMap((r) => [
      {
        value: r.income,
        frontColor: INCOME_COLOR,
        spacing: innerGap,
        label: r.label,
        labelWidth: 2 * barWidth + innerGap,
      },
      { value: r.expense, frontColor: EXPENSE_COLOR, spacing: groupGap },
    ]);

    return <BarChart {...barCommon} data={data} barWidth={barWidth} />;
  }

  function renderLines() {
    const n = trend.length;
    const edge = 12;
    const spacing = n > 1 ? (chartWidth - edge * 2) / (n - 1) : 0;

    return (
      <LineChart
        data={trend.map((r) => ({ value: r.income, label: r.label }))}
        data2={trend.map((r) => ({ value: r.expense }))}
        color1={INCOME_COLOR_2}
        color2={EXPENSE_COLOR_2}
        dataPointsColor1={INCOME_COLOR_2}
        dataPointsColor2={EXPENSE_COLOR_2}
        dataPointsRadius={n > 8 ? 2 : 4}
        thickness={1}
        width={chartWidth}
        height={180}
        noOfSections={4}
        spacing={spacing}
        initialSpacing={edge}
        endSpacing={edge}
        yAxisThickness={0}
        xAxisColor="#E5E3F0"
        rulesColor="#EEECF6"
        yAxisLabelWidth={38}
        yAxisTextStyle={{ color: '#999', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#999', fontSize: 10, textAlign: 'center' }}
        formatYLabel={(label: string) => compact(Number(label))}
        disableScroll
        isAnimated
      />
    );
  }

  // Determine legend colors based on current chart type
  const legendIncomeColor = chartType === 'Pie Chart' ? INCOME_COLOR_2 : INCOME_COLOR;
  const legendExpenseColor = chartType === 'Pie Chart' ? EXPENSE_COLOR_2 : EXPENSE_COLOR;

  // For budget card stats
  const budget = data?.budget;
  const budgetValue = !budget
    ? '—'
    : budget.limitCents === null
      ? 'No limit set'
      : formatKsh(budget.spentCents);

  return (
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
        <Text style={styles.title}>Activity</Text>
        <Ionicons name="notifications-outline" size={22} color="#1A1A1A" />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.chartCard}>
          <View style={styles.chartControlsRow}>
            <DropdownPicker
              label="View"
              options={VIEWS}
              selected={view}
              onSelect={handleViewChange}
              triggerTextStyle={styles.viewTrigger}
              containerStyle={styles.viewPicker}
            />

            <View style={styles.filterGroup}>
              <DropdownPicker
                label="Period"
                options={ANALYTICS_PERIODS}
                selected={period}
                onSelect={(v) => setPeriod(v as AnalyticsPeriod)}
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
              <Text style={styles.empty}>No income or spending recorded in this period.</Text>
            ): chartType === 'Pie Chart' ? (
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

          {!isCategoryView && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: legendIncomeColor }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: legendExpenseColor }]} />
                <Text style={styles.legendText}>Expense</Text>
              </View>
            </View>
          )}
        </View>

        {isCategoryView ? (
          <Animated.View key="list" entering={FadeInDown.duration(250)}>
            <CategoryList
              items={categories.map((c) => ({ name: c.name, amount: c.amount, color: c.color }))}
              total={categoryTotal}
              selectedIndex={chartType === 'Pie Chart' ? selectedIndex : null}
              formatAmount={formatKsh}
            />
          </Animated.View>
        ) : (
          <Animated.View key="grid" entering={FadeInDown.duration(250)} style={styles.grid}>
            <View style={styles.gridRow}>
              <StatCard
                icon="arrow-up"
                label="You've Received"
                value={formatKsh(totals?.incomeCents ?? 0)}
                colors={['#3FBCE3', '#67CAE8', '#7FDFFC', '#25B8E5']}
                gradientLocations={[0, 0.43, 0.56, 1]}
                labelStyle={styles.receivedLabel}
                valueStyle={styles.receivedValue}
              />
              <StatCard
                icon="arrow-down"
                label="You've Spent"
                value={formatKsh(totals?.expenseCents ?? 0)}
                colors={['#F8B64D', '#EBB867', '#F4C476', '#E99E27']}
                gradientLocations={[0, 0.43, 0.56, 1]}
                labelStyle={styles.spentLabel}
                valueStyle={styles.spentValue}
              />
            </View>
            <View style={styles.gridRow}>
              <StatCard
                icon="arrow-down-circle"
                label="Budget Spent"
                value={budgetValue}
                colors={['#6DFA3A', '#76E04F', '#7CE357', '#56C42E']}
                gradientLocations={[0, 0.35, 0.56, 1]}
                progressPercent={budget?.percent ?? undefined}
                labelStyle={styles.budgetLabel}
                valueStyle={styles.budgetValue}
                progressFillStyle={styles.budgetProgressFill}
              />
              <StatCard
                icon="disc"
                label="Goals Achieved"
                value="3 Out of 4"
                colors={['#B234D4', '#D662F7', '#D168EE', '#961EB7']}
                gradientLocations={[0, 0.35, 0.56, 1]}
                progressPercent={75}
                labelStyle={styles.goalsLabel}
                valueStyle={styles.goalsValue}
                progressFillStyle={styles.goalsProgressFill}
              />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0EFF5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    minHeight: 370,
    width: '105%',
    alignSelf: 'center'
  },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#555' },
  grid: { gap: 12 },
  progressCardValue: {
    marginTop: 25,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 5,
    width: '105%',
    alignSelf: 'center'
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
  viewPicker: {
    flexShrink: 1,
  },
  receivedLabel: {
    color: '#05092e',
  },
  receivedValue: {
    color: '#05092e',
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
    color: '#0e0215',
  },
  goalsValue: {
    color: '#20062e',
    fontWeight: '800',
    marginTop: 18,
  },
  goalsProgressFill: {
    backgroundColor: '#6A1B9A',
  },
  viewTrigger: {
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#1A1A1A',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
});