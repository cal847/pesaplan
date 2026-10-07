// frontend/src/app/analytics.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DropdownPicker } from '@/components/shared/dropdown-picker';
import { StatCard } from '@/components/analytics/stat-card';

// Placeholder — swap for GET /api/v1/analytics/income-expense-trend
const MOCK_TREND = [
  { label: 'Mon', value: 200 },
  { label: 'Tue', value: 310 },
  { label: 'Wed', value: 240 },
  { label: 'Thu', value: 60 },
  { label: 'Fri', value: 210 },
  { label: 'Sat', value: 220 },
  { label: 'Sun', value: 200 },
];

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const CHART_TYPES = ['Line Chart', 'Bar Chart'];

export default function AnalyticsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState('Monthly');
  const [chartType, setChartType] = useState('Line Chart');

  const chartData = MOCK_TREND.map((d) => ({ value: d.value, label: d.label }));

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
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Charts</Text>
            <DropdownPicker label="Period" options={PERIODS} selected={period} onSelect={setPeriod} />
            <DropdownPicker
              label="Chart Type"
              options={CHART_TYPES}
              selected={chartType}
              onSelect={setChartType}
            />
          </View>

          {chartType === 'Line Chart' ? (
            <LineChart
              data={chartData}
              color="#3F2FD6"
              thickness={2}
              hideDataPoints={false}
              dataPointsColor="#3F2FD6"
              yAxisTextStyle={{ color: '#999', fontSize: 11 }}
              xAxisLabelTextStyle={{ color: '#999', fontSize: 11 }}
              noOfSections={4}
              height={180}
              spacing={38}
              initialSpacing={10}
            />
          ) : (
            <BarChart
              data={chartData}
              frontColor="#3F2FD6"
              yAxisTextStyle={{ color: '#999', fontSize: 11 }}
              xAxisLabelTextStyle={{ color: '#999', fontSize: 11 }}
              noOfSections={4}
              height={180}
              spacing={24}
              barWidth={18}
              barBorderRadius={4}
            />
          )}
        </View>

        <View style={styles.grid}>
          <StatCard
            icon="arrow-down"
            label="You've Received"
            value="KSh 331,132.58"
            colors={['#6FC8E8', '#3F9FE0']}
          />
          <StatCard
            icon="arrow-up"
            label="You've Spent"
            value="KSh 312,398.49"
            colors={['#F2C14E', '#E8923F']}
          />
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
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: '700', fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});