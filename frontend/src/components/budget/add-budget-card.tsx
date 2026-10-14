import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

export function AddBudgetCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add a budget item"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.circle}>
        <Ionicons name="add" size={22} color="#4B0082" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 108,
    minHeight: 72,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: 'rgba(110, 110, 130, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});