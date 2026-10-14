import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategorySection } from '@/components/budget/category-section';
import { EditBudgetModal } from '@/components/budget/edit-budget-modal';
import { EditCategoryModal } from '@/components/budget/edit-category-modal';
import { EditLimitModal } from '@/components/budget/edit-limit-modal';
import { JiggleLimit } from '@/components/budget/jiggle-card';
import { DropdownPicker } from '@/components/shared/dropdown-picker';
import {
  BudgetItem,
  BudgetSection,
  formatAmount,
  sumItems,
} from '@/components/budget/budget-data';

// Placeholder — swap for GET /api/v1/budgets grouped by category
const INITIAL_SECTIONS: BudgetSection[] = [
  {
    title: 'Income',
    items: [
      { icon: '💼', name: 'Salary', amount: 'Ksh 342,492.00', backgroundColor: '#B8EBC5' },
      { icon: '💰', name: 'Side Hustle', amount: 'Ksh 52,492.00', backgroundColor: '#A8E6D8' },
      { icon: '🏛️', name: 'Dividends', amount: 'Ksh 12,492.00', backgroundColor: '#F5E6A8' },
    ],
  },
  {
    title: 'The Essentials',
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
    items: [
      { icon: '🎵', name: 'Spotify', amount: 'Ksh 129.00', backgroundColor: '#F0A8D8' },
      { icon: '▶️', name: 'Youtube', amount: 'Ksh 300.00', backgroundColor: '#F5C8E0' },
      { icon: '🎬', name: 'Netflix', amount: 'Ksh 1,200.00', backgroundColor: '#F5E0E8' },
    ],
  },
  {
    title: 'Savings & Investments',
    items: [
      { icon: '🐷', name: 'Mshwari', amount: 'Ksh 12,909.00', backgroundColor: '#B8EBC5' },
      { icon: '📈', name: 'NSE', amount: 'Ksh 300,324.00', backgroundColor: '#A8E6D8' },
      { icon: '🏦', name: 'Bank', amount: 'Ksh 1,225,243.00', backgroundColor: '#B8EBC5' },
    ],
  },
  {
    title: 'Debt',
    items: [
      { icon: '🏦', name: 'KCB Loan', amount: 'Ksh 122,909.00', backgroundColor: '#F0A8A0' },
      { icon: '🏦', name: 'Equity Loan', amount: 'Ksh 124,909.00', backgroundColor: '#F5C8C0' },
      { icon: '⚪', name: 'Alex', amount: 'Ksh 1,200.00', backgroundColor: '#F5E0D8' },
    ],
  },
];

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const formatKsh = (n: number) =>
  `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BudgetScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState('Weekly');
  const [editMode, setEditMode] = useState(false);
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [editor, setEditor] = useState<{ sectionTitle: string; item: BudgetItem | null } | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [limit, setLimit] = useState(30000);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  // names already used in the section being edited, minus the item's own name
  const editingSection = sections.find((s) => s.title === editor?.sectionTitle);
  const takenNames = (editingSection?.items ?? [])
    .map((i) => i.name)
    .filter((n) => n !== editor?.item?.name);

  function saveItem(value: BudgetItem) {
    if (!editor) return;
    const editing = editor.item;
    setSections((prev) =>
      prev.map((section) => {
        if (section.title !== editor.sectionTitle) return section;
        return {
          ...section,
          items: editing
            ? section.items.map((it) => (it.name === editing.name ? value : it)) // edit in place
            : [...section.items, value], // new cards go at the end
        };
      })
    );
    // TODO: POST /api/v1/budgets (new) or PATCH (edit) once the API client exists
  }

  function renameSection(oldTitle: string, newTitle: string) {
    const clash = sections.some(
      (s) => s.title !== oldTitle && s.title.toLowerCase() === newTitle.toLowerCase()
    );
    if (clash) return; // titles are the list keys, so duplicates are ignored for now
    setSections((prev) => prev.map((s) => (s.title === oldTitle ? { ...s, title: newTitle } : s)));
    // TODO: PATCH /api/v1/categories/{id} once the API client exists
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>

        <Text style={styles.title}>My Budget</Text>

        <TouchableOpacity onPress={() => setEditMode((v) => !v)}>
          <Ionicons name={editMode ? 'checkmark' : 'pencil'} size={25} color="#2e0359" />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <JiggleLimit
          amount={formatKsh(limit)}
          editMode={editMode}
          onPress={() => setLimitModalOpen(true)}
        />
        <DropdownPicker
          label="Period"
          options={PERIODS}
          selected={period}
          onSelect={setPeriod}
          disabled={!editMode}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section, index) => (
          <CategorySection
            key={section.title}
            title={section.title}
            total={formatAmount(sumItems(section.items))}
            items={section.items}
            editMode={editMode}
            index={index}
            onItemPress={(item) => setEditor({ sectionTitle: section.title, item })}
            onAddPress={() => setEditor({ sectionTitle: section.title, item: null })}
            onTitlePress={() => setEditingCategory(section.title)}
          />
        ))}
      </ScrollView>

      <EditBudgetModal
        visible={!!editor}
        item={editor?.item ?? null}
        sectionTitle={editor?.sectionTitle}
        takenNames={takenNames}
        onClose={() => setEditor(null)}
        onSave={saveItem}
      />

      <EditCategoryModal
        visible={!!editingCategory}
        currentTitle={editingCategory ?? ''}
        onClose={() => setEditingCategory(null)}
        onSave={(newTitle) => {
          if (editingCategory) renameSection(editingCategory, newTitle);
          setEditingCategory(null);
        }}
      />

      <EditLimitModal
        visible={limitModalOpen}
        currentLimit={limit}
        onClose={() => setLimitModalOpen(false)}
        onSave={(value) => {
          setLimit(value);
          // TODO: persist to the user's spending_limit once the API client exists
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
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scroll: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 80 },
});