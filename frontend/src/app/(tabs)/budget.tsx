import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/app-text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PAGE_BACKGROUND } from '@/constants/colors';
import { CategorySection } from '@/components/budget/category-section';
import { EditBudgetModal } from '@/components/budget/edit-budget-modal';
import { EditCategoryModal } from '@/components/budget/edit-category-modal';
import { EditLimitModal } from '@/components/budget/edit-limit-modal';
import { JiggleLimit } from '@/components/budget/jiggle-card';
import { DropdownPicker } from '@/components/shared/dropdown-picker';
import { BudgetItem, BudgetItemInput, BudgetSection, sumItems} from '@/components/budget/budget-data';
import { ConfirmDeleteModal } from '@/components/shared/confimr-delete';
import { useBudget } from '@/hooks/use-budget';
import { addItem, deleteItem, renameSection, updateItem } from '@/lib/db/budget';
import { getDb } from '@/lib/db/database';
import type { SpendingPeriod } from '@/lib/period';
import { formatKsh } from '@/lib/sms/money';
import { useSettingsStore } from '@/stores/settings-store';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
type Editor = { sectionId: string; sectionTitle: string; item: BudgetItem | null };

export default function BudgetScreen() {
  const router = useRouter();
  const period = useSettingsStore((s) => s.spendingPeriod);
  const setPeriod = useSettingsStore((s) => s.setSpendingPeriod);

  const limitCents = useSettingsStore((s) => s.spendingLimitCents);
  const setLimitCents = useSettingsStore((s) => s.setSpendingLimitCents);

  const { sections, reload } = useBudget()

  const [editMode, setEditMode] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BudgetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // names already used in the section being edited, minus the item's own name
  const editingSection = sections?.find((s) => s.id === editor?.sectionId);
  const takenNames = (editingSection?.items ?? [])
    .map((i) => i.name)
    .filter((n) => n !== editor?.item?.name);

  // Every change writes to the database and then reloads.
  async function mutate(action: () => Promise<string | void>, duplicateText: string) {
    try {
      if ((await action()) === 'duplicate') Alert.alert('Already in use', duplicateText);
    } catch (e) {
      console.warn('budget change failed', e);
      Alert.alert('Something went wrong', "Your change couldn't be saved.");
    } finally {
      await reload().catch(() => {});
    }
  }

  function saveItem(value: BudgetItemInput) {
    if (!editor) return;
    const { sectionId, item } = editor; // read now, because the modal closes right after
    mutate(async () => {
      const db = await getDb();
      return item ? updateItem(db, item.id, value) : addItem(db, sectionId, value);
    }, 'An item with that name already exists in this category.');
  }
  
  function saveRename(newTitle: string) {
    if (!renaming) return;
    const { id } = renaming;
    mutate(
      async () => renameSection(await getDb(), id, newTitle),
      'A category with that name already exists.'
    );
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    setIsDeleting(true);
    await mutate(async () => deleteItem(await getDb(), itemToDelete.id), '');
    setIsDeleting(false);
    setItemToDelete(null);
  }

  const isEmpty = !!sections && sections.every((s) => s.items.length === 0);

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

        <Text variant="heading" style={styles.title}>My Budget</Text>

        <TouchableOpacity onPress={() => setEditMode((v) => !v)}>
          <Ionicons name={editMode ? 'checkmark' : 'pencil'} size={25} color="#2e0359" />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <JiggleLimit
          amount={limitCents === null ? 'Not set' : formatKsh(limitCents / 100)}
          editMode={editMode}
          onPress={() => setLimitModalOpen(true)}
        />
        <DropdownPicker
          label="Period"
          options={PERIODS}
          selected={period}
          onSelect={(v) => setPeriod(v as SpendingPeriod)}
          disabled={!editMode}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {isEmpty && !editMode && (
          <Text style={styles.hint}>
            Nothing here yet. Tap the pencil to add your first budget items.
          </Text>
        )}

        {(sections ?? []).map((section, index) => (
          <CategorySection
            key={section.id}
            title={section.title}
            total={formatKsh(sumItems(section.items))}
            items={section.items}
            editMode={editMode}
            index={index}
            onItemPress={(item) =>
              setEditor({ sectionId: section.id, sectionTitle: section.title, item })
            }
            onAddPress={() =>
              setEditor({ sectionId: section.id, sectionTitle: section.title, item: null })
            }
            onTitlePress={() => setRenaming({ id: section.id, title: section.title })}
            onItemDelete={(item) => setItemToDelete(item)}
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
        visible={!!renaming}
        currentTitle={renaming?.title ?? ''}
        onClose={() => setRenaming(null)}
        onSave={(newTitle) => {
          saveRename(newTitle);
          setRenaming(null);
        }}
      />

      <EditLimitModal
        visible={limitModalOpen}
        currentLimit={(limitCents ?? 0) / 100}
        onClose={() => setLimitModalOpen(false)}
        onSave={(value) => setLimitCents(Math.round(value * 100))}
      />

      <ConfirmDeleteModal
        visible={!!itemToDelete}
        title="Delete budget item?"
        message={`Are you sure you want to delete “${
          itemToDelete?.name ?? ''
        }”?`}
        loading={isDeleting}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    color: '#1A1A1A',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hint: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 16 },
  scroll: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 80 },
});