// frontend/src/components/budget/jiggle-card.tsx
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

/**
 * The one copy of the jiggle logic. Odd and even indexes sway opposite ways,
 * so neighbors don't move in sync (same trick iOS uses).
 */
function useJiggle(active: boolean, index: number, amplitude = 1.5) {
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
  }, [active]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
}

/* ---------------------------------- Card ---------------------------------- */

type CardProps = {
  icon: string; // emoji placeholder, swap for real icons/merchant logos later
  name: string;
  amount: string;
  backgroundColor: string;
  editMode: boolean;
  index: number;
  onPress: () => void;
};

export function JiggleCard({ icon, name, amount, backgroundColor, editMode, index, onPress }: CardProps) {
  const animatedStyle = useJiggle(editMode, index);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.card, { backgroundColor }]}
        onPress={editMode ? onPress : undefined}
        disabled={!editMode}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.amount}>{amount}</Text>
        {editMode && (
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✎</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ----------------------------- Spending limit ----------------------------- */

type LimitProps = {
  amount: string; // already formatted, e.g. "KSh 30,000.00"
  editMode: boolean;
  onPress: () => void;
};

// Jiggles with the cards but has no ✎ badge. index 1 makes it sway the opposite
// way to the first card, which is the first thing below it.
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
  card: { borderRadius: 14, padding: 10, width: 108, marginRight: 8 },
  icon: { fontSize: 16 },
  name: { fontWeight: '700', fontSize: 12, marginTop: 4, color: '#1A1A1A' },
  amount: { fontSize: 11, color: '#333', marginTop: 2 },
  editBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#3F2FD6',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadgeText: { color: '#FFF', fontSize: 10 },
  limitLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#3c0854',
    marginHorizontal: 12,
  },
  limitAmount: { fontWeight: '800' },
});