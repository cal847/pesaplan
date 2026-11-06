// frontend/src/components/budget/jiggle-card.tsx
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export function useJiggle(active: boolean, index: number, amplitude = 1.5) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (active) {
      const direction = index % 2 === 0 ? 1 : -1;

      rotation.value = withRepeat(
        withSequence(
          withTiming(amplitude * direction, { duration: 120 }),
          withTiming(-amplitude * direction, { duration: 120 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 100 });
    }
  }, [active, index, amplitude, rotation]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
}

/* ---------------------------------- Card ---------------------------------- */

type CardProps = {
  icon: string;
  name: string;
  amount: string;
  backgroundColor: string;
  editMode: boolean;
  index: number;
  onPress: () => void;
  onDelete: () => void;
};

export function JiggleCard({
  icon,
  name,
  amount,
  backgroundColor,
  editMode,
  index,
  onPress,
  onDelete,
}: CardProps) {
  const animatedStyle = useJiggle(editMode, index);

  const editProgress = useSharedValue(editMode ? 1 : 0);

  useEffect(() => {
    editProgress.value = withTiming(editMode ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [editMode, editProgress]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(editProgress.value, [0, 1], [10, 35]),
    paddingBottom: interpolate(editProgress.value, [0, 1], [5, 5]),
    paddingHorizontal: interpolate(editProgress.value, [0, 1], [0, 10]),
    gap: interpolate(editProgress.value, [0, 1], [15, 10]),
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.card, { backgroundColor }]}
        onPress={editMode ? onPress : undefined}
        disabled={!editMode}
      >
        <Animated.View
          style={[styles.cardContent, animatedContentStyle]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name={icon} size={20} color="#1A1A1A" />
            <Text style={styles.name}>{name}</Text>
          </View>

          <Text style={styles.amount}>{amount}</Text>

          {editMode && (
            <>
              <Pressable
                style={styles.deleteBadge}
                onPress={onDelete}
                hitSlop={8}
              >
                <Text style={styles.deleteBadgeText}>×</Text>
              </Pressable>

              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>✎</Text>
              </View>
            </>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/* ----------------------------- Spending limit ----------------------------- */

type LimitProps = {
  amount: string;
  editMode: boolean;
  onPress: () => void;
};

export function JiggleLimit({ amount, editMode, onPress }: LimitProps) {
  const animatedStyle = useJiggle(editMode, 1);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} disabled={!editMode} hitSlop={10}>
        <Text style={styles.limitLabel}>
          Spending Limit: <Text style={styles.limitAmount}>{amount}</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 10, paddingTop: 5, width: 150, marginRight: 8, minHeight: 100, justifyContent: 'space-between'},
  icon: { fontSize: 16 },
  name: { fontWeight: '700', fontSize: 14, marginTop: 4, color: '#1A1A1A' },
  amount: { fontSize: 13, color: '#333', marginTop: 2 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardContent: {
    gap: 15,
    paddingTop: 10,
    paddingBottom: 5,
  },
  cardContentEditable: {
    gap: 10,
    paddingTop: 35,
    paddingBottom: 5,
    paddingHorizontal: 10
  },
  editBadge: {
    position: 'absolute',
    top: 1,
    right: -5,
    backgroundColor: '#3F2FD6',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadge: {
    position: 'absolute',
    top: 1,
    left: -4,
    backgroundColor: '#d6898c',
    width: 20,
    height: 20,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 5,
  },

  deleteBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 21,
  },
  editBadgeText: { color: '#FFF', fontSize: 10 },
  limitLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#3c0854',
    marginHorizontal: 12,
  },
  limitAmount: { fontWeight: '600' },
});