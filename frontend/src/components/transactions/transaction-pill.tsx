import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';

type Props = {
  merchantName: string;
  date: string;
  code: string;
  amountText: string;
  amountColor: string;
};

export function TransactionPill({ merchantName, date, code, amountText, amountColor }: Props) {
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.details}>
          <Text style={styles.merchant} numberOfLines={1}>{merchantName}</Text>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.code} numberOfLines={1}>{code}</Text>
        </View>
        <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>
          {amountText}
        </Text>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  merchant: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1724',
  },
  date: {
    fontSize: 12,
    color: '#6E6A78',
  },
  code: {
    fontSize: 11,
    color: '#8D8996',
  },
  amount: {
    maxWidth: '46%',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderBottomColor: '#D5D0E0',
  },
});