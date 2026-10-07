import { StyleSheet, Text, View } from 'react-native';

type Props = { merchantName: string; date: string; amount: number };

export function TransactionPill({ merchantName, date, amount }: Props) {
  return (
    <View style={styles.pill}>
      <View>
        <Text style={styles.merchant}>{merchantName}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <Text style={styles.amount}>-Ksh {amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  merchant: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  date: { fontSize: 11, color: '#999', marginTop: 1 },
  amount: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
});