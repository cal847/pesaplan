// frontend/src/components/home/bill-card.tsx
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  name: string;
  amount: number;
  daysLeft: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
};

export function BillCard({ name, amount, daysLeft, icon, iconColor, backgroundColor }: Props) {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={[styles.name, { color: iconColor }]}>{name}</Text>
      </View>
      <Text style={styles.amount}>Ksh {amount.toFixed(2)}</Text>
      <Text style={styles.daysLeft}>
        {daysLeft} {daysLeft === 1 ? 'Day' : 'Days'} Left
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
  },
  amount: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '600',
  },
  daysLeft: {
    fontSize: 13,
    color: '#555555',
  },
});