// frontend/src/app/goals.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { AddGoalModal } from '@/components/goals/add-goal-modal';

// Placeholder — swap for GET /api/v1/goals and /api/v1/goals/progress/all
const TOP_GOALS = ['Travel to Mumbai', 'Buy a new laptop', 'Move out', 'Buy a new Kettle'];
const CURRENT_GOALS = [
  'Travel to Mumbai',
  'Get a valentines gift',
  'Buy a new laptop',
  'Move out',
  'Buy a new Kettle',
  'Buy a new watch',
];

export default function GoalsScreen() {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<'create' | 'topup' | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  // split into two columns like the design
  const leftColumn = CURRENT_GOALS.filter((_, i) => i % 2 === 0);
  const rightColumn = CURRENT_GOALS.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>My Goals</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topRow}>
          <LinearGradient colors={['#C98DE8', '#7B3FE0']} style={styles.topGoalsCard}>
            <View style={styles.topGoalsHeader}>
              <Ionicons name="trophy-outline" size={18} color="#FFF" />
              <Text style={styles.topGoalsTitle}>Your Top Goals</Text>
            </View>
            {TOP_GOALS.map((goal) => (
              <View key={goal} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{goal}</Text>
              </View>
            ))}
          </LinearGradient>

          <View style={styles.actionColumn}>
            <TouchableOpacity style={styles.actionCard} onPress={() => setModalMode('create')}>
              <Text style={styles.actionLabel}>Add A New Goal</Text>
              <View style={[styles.actionCircle, { backgroundColor: '#C98DE8' }]}>
                <Ionicons name="add" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => setModalMode('topup')}>
              <Text style={styles.actionLabel}>Top Up For a Specific Goal</Text>
              <View style={[styles.actionCircle, { backgroundColor: '#5FBF6F' }]}>
                <Ionicons name="add" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.currentGoalsCard}>
          <Text style={styles.currentGoalsTitle}>Current Goals</Text>
          <View style={styles.checklistRow}>
            <View style={styles.checklistColumn}>
              {leftColumn.map((goal, i) => (
                <GoalCheckRow key={`l-${goal}-${i}`} label={goal} checked={!!checked[`l-${goal}-${i}`]} onPress={() => toggle(`l-${goal}-${i}`)} />
              ))}
            </View>
            <View style={styles.checklistColumn}>
              {rightColumn.map((goal, i) => (
                <GoalCheckRow key={`r-${goal}-${i}`} label={goal} checked={!!checked[`r-${goal}-${i}`]} onPress={() => toggle(`r-${goal}-${i}`)} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <AddGoalModal
        visible={modalMode !== null}
        mode={modalMode ?? 'create'}
        onClose={() => setModalMode(null)}
        onSubmit={(data) => {
          // TODO: POST /api/v1/goals or /api/v1/goals/{id}/topup once wired
          console.log(modalMode, data);
        }}
      />
    </SafeAreaView>
  );
}

function GoalCheckRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={12} color="#FFF" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0EFF5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  topRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  topGoalsCard: { flex: 1.3, borderRadius: 20, padding: 16 },
  topGoalsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  topGoalsTitle: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  bulletText: { color: '#FFF', fontSize: 13 },
  actionColumn: { flex: 1, gap: 12 },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  actionCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  currentGoalsCard: { backgroundColor: '#D8EFD8', borderRadius: 20, padding: 16 },
  currentGoalsTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  checklistRow: { flexDirection: 'row', gap: 16 },
  checklistColumn: { flex: 1, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#5FA85F', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#5FA85F' },
  checkLabel: { fontSize: 12, color: '#1A1A1A' },
});