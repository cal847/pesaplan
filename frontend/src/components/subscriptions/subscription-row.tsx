import { StyleSheet, Text, View } from 'react-native';

type Props = { name: string; dueDate: string; amount: number };

export function SubscriptionRow({ name, dueDate, amount }: Props) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.dueDate}>{dueDate}</Text>
      </View>
      <Text style={styles.amount}>Ksh {amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  name: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  dueDate: { fontSize: 12, color: '#888', marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
});