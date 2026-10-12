import { StyleSheet, Text, View } from 'react-native';

type Props = {
  merchantName: string;
  timestamp: string; // pre-formatted, e.g. "Wednesday, 10:15 AM"
  amount: number;
  emoji: string; // placeholder until real merchant icons exist
};

export function TransactionRow({ merchantName, timestamp, amount, emoji }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View>
          <Text style={styles.merchant}>{merchantName}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>
      <Text style={styles.amount}>-KSh {amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2b0c0c2f',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 20,
  },
  merchant: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1A1A1A',
  },
  timestamp: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  amount: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1A1A1A',
  },
});