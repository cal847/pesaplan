// frontend/src/app/budget.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySection } from '@/components/budget/category-section';
import { EditBudgetModal } from '@/components/budget/edit-budget-modal';
import { DropdownPicker } from '@/components/shared/dropdown-picker';

type BudgetItem = { icon: string; name: string; amount: string; backgroundColor: string };

// Placeholder — swap for GET /api/v1/budgets grouped by category
const SECTIONS: { title: string; total: string; items: BudgetItem[] }[] = [
  {
    title: 'Income',
    total: 'Ksh 23,189.00',
    items: [
      { icon: '💼', name: 'Salary', amount: 'Ksh 342,492.00', backgroundColor: '#B8EBC5' },
      { icon: '💰', name: 'Side Hustle', amount: 'Ksh 52,492.00', backgroundColor: '#A8E6D8' },
      { icon: '🏛️', name: 'Dividends', amount: 'Ksh 12,492.00', backgroundColor: '#F5E6A8' },
    ],
  },
  {
    title: 'The Essentials',
    total: 'Ksh 23,189.00',
    items: [
      { icon: '🍽️', name: 'Food', amount: 'Ksh 23,189.00', backgroundColor: '#A8D8F0' },
      { icon: '🏠', name: 'Rent', amount: 'Ksh 15,000.00', backgroundColor: '#C8E8D8' },
      { icon: '💧', name: 'Water', amount: 'Ksh 2,500.00', backgroundColor: '#C8E8D8' },
      { icon: '⚡', name: 'Electricity', amount: 'Ksh 3,000.00', backgroundColor: '#A8D8F0' },
      { icon: '📶', name: 'Wifi', amount: 'Ksh 1,500.00', backgroundColor: '#C8E8D8' },
      { icon: '🚌', name: 'Transport', amount: 'Ksh 3,000.00', backgroundColor: '#A8D8F0' },
    ],
  },
  {
    title: 'Subscriptions',
    total: 'Ksh 23,189.00',
    items: [
      { icon: '🎵', name: 'Spotify', amount: 'Ksh 129.00', backgroundColor: '#F0A8D8' },
      { icon: '▶️', name: 'Youtube', amount: 'Ksh 300.00', backgroundColor: '#F5C8E0' },
      { icon: '🎬', name: 'Netflix', amount: 'Ksh 1,200.00', backgroundColor: '#F5E0E8' },
    ],
  },
  {
    title: 'Savings & Investments',
    total: 'Ksh 23,189.00',
    items: [
      { icon: '🐷', name: 'Mshwari', amount: 'Ksh 12,909.00', backgroundColor: '#B8EBC5' },
      { icon: '📈', name: 'NSE', amount: 'Ksh 300,324.00', backgroundColor: '#A8E6D8' },
      { icon: '🏦', name: 'Bank', amount: 'Ksh 1,225,243.00', backgroundColor: '#B8EBC5' },
    ],
  },
  {
    title: 'Debt',
    total: 'Ksh 23,189.00',
    items: [
      { icon: '🏦', name: 'KCB Loan', amount: 'Ksh 122,909.00', backgroundColor: '#F0A8A0' },
      { icon: '🏦', name: 'Equity Loan', amount: 'Ksh 124,909.00', backgroundColor: '#F5C8C0' },
      { icon: '⚪', name: 'Alex', amount: 'Ksh 1,200.00', backgroundColor: '#F5E0D8' },
    ],
  },
];

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export default function BudgetScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState('Weekly');
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <DropdownPicker label="Period" options={PERIODS} selected={period} onSelect={setPeriod} />
        <TouchableOpacity onPress={() => setEditMode((v) => !v)}>
          <Ionicons name={editMode ? 'checkmark' : 'pencil'} size={20} color="#3F2FD6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.limitLabel}>
        Spending Limit: <Text style={styles.limitAmount}>KSh 30,000.00</Text>
      </Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        onScrollBeginDrag={() => editMode && undefined /* keep jiggle during scroll */}>
        {SECTIONS.map((section) => (
          <CategorySection
            key={section.title}
            title={section.title}
            total={section.total}
            items={section.items}
            editMode={editMode}
            onItemPress={setEditingItem}
          />
        ))}
      </ScrollView>

      <EditBudgetModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(updated) => {
          // TODO: PATCH /api/v1/budgets/{id} once wired to real data
          console.log('saved', updated);
        }}
      />
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
  limitLabel: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#3F2FD6', marginBottom: 12 },
  limitAmount: { fontWeight: '800' },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
});