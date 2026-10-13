// frontend/src/app/(tabs)/analytics.tsx
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

const VIEWS = ['Income vs Expense', 'Category Spending'];
const PERIODS = ['Weekly', 'Monthly', 'Yearly'];
const CHART_TYPES_BY_VIEW: Record<string, string[]> = {
  'Income vs Expense': ['Bar Chart', 'Line Chart', 'Pie Chart'],
  'Category Spending': ['Bar Chart', 'Pie Chart'],
};
const INCOME_COLOR = '#3F9FE0'; // matches the "You've Received" card
const EXPENSE_COLOR = '#E8923F'; // matches the "You've Spent" card

const TREND: Record<string, { label: string; income: number; expense: number }[]> = {
  Weekly: [
    { label: 'Mon', income: 1200, expense: 800 },
    { label: 'Tue', income: 0, expense: 450 },
    { label: 'Wed', income: 3500, expense: 1200 },
    { label: 'Thu', income: 0, expense: 300 },
    { label: 'Fri', income: 2500, expense: 1800 },
    { label: 'Sat', income: 600, expense: 2200 },
    { label: 'Sun', income: 0, expense: 900 },
  ],
  Monthly: [
    { label: 'W1', income: 15000, expense: 9200 },
    { label: 'W2', income: 4000, expense: 7800 },
    { label: 'W3', income: 22000, expense: 8800 },
    { label: 'W4', income: 6500, expense: 7100 },
  ],
  Yearly: [
    { label: 'J', income: 62000, expense: 48000 },
    { label: 'F', income: 58000, expense: 52000 },
    { label: 'M', income: 71000, expense: 55000 },
    { label: 'A', income: 64000, expense: 50000 },
    { label: 'M', income: 69000, expense: 61000 },
    { label: 'J', income: 73000, expense: 58000 },
    { label: 'J', income: 66000, expense: 54000 },
    { label: 'A', income: 70000, expense: 63000 },
    { label: 'S', income: 68000, expense: 57000 },
    { label: 'O', income: 75000, expense: 66000 },
    { label: 'N', income: 72000, expense: 59000 },
    { label: 'D', income: 80000, expense: 71000 },
  ],
};

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

const formatKsh = (n: number) => `Ksh ${n.toLocaleString('en-KE')}`;
const compact = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n));

export default function AnalyticsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [view, setView] = useState(VIEWS[0]);
  const [period, setPeriod] = useState('Monthly');
  const [chartType, setChartType] = useState('Bar Chart');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => setSelectedIndex(null), [view, period, chartType]);

  const isCategoryView = view === 'Category Spending';
  const trend = TREND[period];
  const totalIncome = trend.reduce((s, r) => s + r.income, 0);
  const totalExpense = trend.reduce((s, r) => s + r.expense, 0);

  const categories = useMemo(
    () => [...CATEGORIES[period]].sort((a, b) => b.amount - a.amount),
    [period]
  );
  const categoryTotal = categories.reduce((s, c) => s + c.amount, 0);

  const slices: Slice[] = isCategoryView
    ? categories.map((c) => ({ label: c.name, value: c.amount, color: c.color }))
    : [
        { label: 'Income', value: totalIncome, color: INCOME_COLOR },
        { label: 'Expense', value: totalExpense, color: EXPENSE_COLOR },
      ];

  const chartWidth = width - 114;

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

  // FIX 1: renderBars is now properly closed before renderLines begins
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
    
    // income vs expense: two bars per period, sized to the number of periods
    const unit = chartWidth / trend.length;
    const barWidth = Math.max(5, Math.min(18, Math.floor(unit * 0.3)));
    const innerGap = 2;
    const groupGap = Math.max(4, unit - 2 * barWidth - innerGap);

    const data = trend.flatMap((r) => [
      {
        value: r.income,
        frontColor: INCOME_COLOR,
        spacing: innerGap,
        label: r.label,
        labelWidth: 2 * barWidth + innerGap, // centers the label under the pair
      },
      { value: r.expense, frontColor: EXPENSE_COLOR, spacing: groupGap },
    ]);

    return <BarChart {...barCommon} data={data} barWidth={barWidth} />;
  }

  // FIX 2: renderLines is now a sibling function, accessible in the JSX return
  function renderLines() {
    const n = trend.length;
    const edge = 12;
    const spacing = n > 1 ? (chartWidth - edge * 2) / (n - 1) : 0;

    return (
      <LineChart
        data={trend.map((r) => ({ value: r.income, label: r.label }))}
        data2={trend.map((r) => ({ value: r.expense }))}
        color1={INCOME_COLOR}
        color2={EXPENSE_COLOR}
        dataPointsColor1={INCOME_COLOR}
        dataPointsColor2={EXPENSE_COLOR}
        dataPointsRadius={n > 8 ? 2 : 4}
        thickness={2}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
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
                options={PERIODS}
                selected={period}
                onSelect={setPeriod}
              />

              <DropdownPicker
                label="Chart Type"
                options={CHART_TYPES_BY_VIEW[view]}
                selected={chartType}
                onSelect={setChartType}
              />
            </View>
          </View>

          {chartType === 'Pie Chart' ? (
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

          {!isCategoryView && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: INCOME_COLOR }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EXPENSE_COLOR }]} />
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
                icon="arrow-down"
                label="You've Received"
                value={formatKsh(totalIncome)}
                colors={['#6FC8E8', '#3F9FE0']}
              />
              <StatCard
                icon="arrow-up"
                label="You've Spent"
                value={formatKsh(totalExpense)}
                colors={['#F2C14E', '#E8923F']}
              />
            </View>
            <View style={styles.gridRow}>
              <StatCard
                icon="arrow-down-circle"
                label="Budget Spent"
                value="KSh 23,139.38"
                colors={['#8DD98D', '#4CAF50']}
                progressPercent={35}
              />
              <StatCard
                icon="disc"
                label="Goals Achieved"
                value="3 Out of 4"
                colors={['#C98DE8', '#9B4FE0']}
                progressPercent={75}
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
  chartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 20 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#555' },
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  chartControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 5,
  },
  viewPicker: {
    flexShrink: 1,
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