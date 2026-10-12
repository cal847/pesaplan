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

type Props = {
  icon: string; // emoji placeholder, swap for real icons/merchant logos later
  name: string;
  amount: string;
  backgroundColor: string;
  editMode: boolean;
  index: number;
  onPress: () => void;
};

export function JiggleCard({ icon, name, amount, backgroundColor, editMode, index, onPress }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (editMode) {
      // alternate phase by index — same trick iOS uses so cards don't jiggle in sync
      const direction = index % 2 === 0 ? 1 : -1;
      rotation.value = withRepeat(
        withSequence(
          withTiming(1.5 * direction, { duration: 120 }),
          withTiming(-1.5 * direction, { duration: 120 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 100 });
    }
  }, [editMode]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
});