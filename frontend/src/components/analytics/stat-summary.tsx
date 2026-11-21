import { Text } from '@/components/app-text';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export type SummaryItem = {
  label: string;
  value: string | null;
  amount?: string;
  color?: string;
  amountColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendColor?: string;
};

type Props = {
  items: SummaryItem[];
};

export function SummaryGrid({ items }: Props) {
  const rows = [];

  for (let index = 0; index < items.length; index += 2) {
    const left = items[index];
    const right = items[index + 1];

    rows.push(
      <View key={`row-${index}`} style={styles.row}>
        <SummaryCell item={left} />

        {right ? (
          <>
            <View style={styles.verticalDivider} />
            <SummaryCell item={right} />
          </>
        ) : (
          <View style={styles.emptyCell} />
        )}
      </View>
    );

    if (index + 2 < items.length) {
      rows.push(<View key={`divider-${index}`} style={styles.horizontalDivider} />);
    }
  }

  return <View style={styles.grid}>{rows}</View>;
}

function SummaryCell({ item }: { item: SummaryItem }) {
  const trendIcon =
    item.trend === 'up'
      ? 'trending-up'
      : item.trend === 'down'
        ? 'trending-down'
        : null;

  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{item.label}</Text>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: item.color ?? 'rgba(26, 26, 26, 0.65)' }]}>
          {item.value}
        </Text>

        {trendIcon && (
          <Ionicons
            name={trendIcon}
            size={14}
            color={item.trendColor ?? '#1A1A1A'}
          />
        )}
      </View>

      {item.amount !== undefined && (
        <Text style={[styles.amount, { color: item.amountColor ?? '#1a1a1ad4' }]}>{item.amount}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    // paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyCell: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  amount: {
    fontSize: 16,
    paddingTop: 4,
    fontWeight: '700',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },
  horizontalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
});