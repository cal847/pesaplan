import { StyleSheet, Text, View } from 'react-native';

type Props = {
  merchantName: string;
  timestamp: string; // pre-formatted, e.g. "Wednesday, 10:15 AM"
  amountText: string;
  amountColor: string;
  emoji: string; // placeholder until real merchant icons exist
};

export function TransactionRow({ merchantName, timestamp, amountText, amountColor, emoji }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {/* <Text style={styles.emoji}>{emoji}</Text> */}
        <View>
          <Text style={styles.merchant}>{merchantName}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(224, 222, 255, 0.16)',
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 20,
  },
  merchant: {
    fontWeight: '600',
    fontSize: 12,
    color: '#F3F1FF',
    fontFamily: 'IBMPlexMono_400Regular',
  },
  timestamp: {
    fontSize: 10,
    color: '#A6A5C2',
    marginTop: 2,
  },
  amount: {
    fontSize: 12,
    fontFamily: 'IBMPlexMono_400Regular',
    fontWeight: '600',
    marginLeft: 8,
  },
});