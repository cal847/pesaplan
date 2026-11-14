import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { PAGE_BACKGROUND } from '@/constants/colors';
import { AddGoalModal } from '@/components/goals/add-goal-modal';

// Placeholder — swap for GET /api/v1/goals and /api/v1/goals/progress/all
const TOP_GOALS = [
  'Travel to Mumbai',
  'Buy a new laptop',
  'Move out',
  'Buy a new Kettle',
];

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

  const toggle = (key: string) =>
    setChecked((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));

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

        <Text style={styles.title}>My Goals</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Full-width top goals */}
        <LinearGradient
          colors={['#C98DE8', '#7B3FE0']}
          style={styles.topGoalsCard}
        >
          <View style={styles.topGoalsHeader}>
            <Ionicons name="trophy-outline" size={18} color="#FFFFFF" />
            <Text style={styles.topGoalsTitle}>Your Top Goals</Text>
          </View>

          {TOP_GOALS.map((goal) => (
            <View key={goal} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{goal}</Text>
            </View>
          ))}
        </LinearGradient>

        {/* Add goal / top up */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={() => setModalMode('create')}
          >
            <Text style={styles.actionLabel}>Add A New Goal</Text>

            <View style={[styles.actionCircle, { backgroundColor: '#C98DE8' }]}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.85}
            onPress={() => setModalMode('topup')}
          >
            <Text style={styles.actionLabel}>Top Up For a Specific Goal</Text>

            <View style={[styles.actionCircle, { backgroundColor: '#5FBF6F' }]}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Current goals */}
        <View style={styles.currentGoalsCard}>
          <Text style={styles.currentGoalsTitle}>Current Goals</Text>

          <View style={styles.goalList}>
            {CURRENT_GOALS.map((goal, index) => (
              <GoalCheckRow
                key={goal}
                label={goal}
                checked={!!checked[goal]}
                onPress={() => toggle(goal)}
                isLast={index === CURRENT_GOALS.length - 1}
              />
            ))}
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

function GoalCheckRow({
  label,
  checked,
  onPress,
  isLast,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.checkRow, !isLast && styles.checkRowDivider]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && (
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        )}
      </View>

      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
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
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSpacer: {
    width: 22,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },

  topGoalsCard: {
    marginTop: 10,
    width: '105%',
    minHeight: 200,
    borderRadius: 16,
    padding: 16,
    alignSelf: 'center',
    alignItems: 'center'
  },
  topGoalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  topGoalsTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  bulletText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    alignSelf: 'center'
  },

  // Add goal and top-up actions
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1A1A1A',
  },
  actionCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  // Full-width current goals container
  currentGoalsCard: {
    width: '105%',
    alignSelf: 'center',
    backgroundColor: '#D8EFD8',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  currentGoalsTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    color: '#021f02',
    paddingTop: 5,
  },
  goalList: {
    width: '100%',
  },

  // Category-list-style rows with grey dividers
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  checkRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#C9CFC9',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#5FA85F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#5FA85F',
    borderColor: '#5FA85F',
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
  },
});