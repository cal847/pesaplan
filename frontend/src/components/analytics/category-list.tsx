
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { LinearGradient } from 'expo-linear-gradient';

type Item = {
  name: string;
  amount: number;
  color: string;
};

type Props = {
  items: Item[];
  total: number;
  selectedIndex: number | null;
  formatAmount: (n: number) => string;
};

export function CategoryList({
  items,
  total,
  selectedIndex,
  formatAmount,
}: Props) {
  return (
    <View style={styles.card}>
      {items.map((item, i) => (
        <View key={`${item.name}-${i}`}>
          <View
            style={[
              styles.row,
              i === selectedIndex && styles.rowSelected,
            ]}
          >
            <Text style={styles.rank}>{i + 1}</Text>

            <View
              style={[
                styles.dot,
                { backgroundColor: item.color },
              ]}
            />

            <Text style={styles.name}>{item.name}</Text>

            <View style={styles.right}>
              <Text style={styles.amount}>
                {formatAmount(item.amount)}
              </Text>

              <Text style={styles.percent}>
                {total > 0
                  ? ((item.amount / total) * 100).toFixed(1)
                  : '0.0'}
                %
              </Text>
            </View>
          </View>

          {/* Divider between rows, excluding the final row */}
          {i < items.length - 1 && (
            <LinearGradient
                colors={[
                'rgba(65, 12, 12, 0)',
                'rgba(65, 12, 12, 0.65)',
                'rgba(65, 12, 12, 0.65)',
                'rgba(65, 12, 12, 0)',
                ]}
                locations={[0, 0.35, 0.65, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.divider}
            />
        )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  rowSelected: {
    backgroundColor: '#F1EEFF',
  },

  rank: {
    width: 20,
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },

  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  right: {
    alignItems: 'flex-end',
  },

  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  percent: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },

  divider: {
    width: '105%',
    alignSelf: 'center',
    height: 1,
    borderRadius: 10,
  },
});
