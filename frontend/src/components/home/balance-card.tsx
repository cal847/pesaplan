// frontend/src/components/home/balance-card.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  balance: number;
  received: number;
  spent: number;
};

function formatKsh(amount: number) {
  return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BalanceCard({ balance, received, spent }: Props) {
  return (
    <LinearGradient
      colors={['#5B3FE0', '#3F2FD6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <Text style={styles.label}>Your Balance</Text>
      <Text style={styles.balance}>{formatKsh(balance)}</Text>

      <View style={styles.row}>
        <View style={styles.statBlock}>
          <View style={styles.statHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Ionicons name="arrow-down" size={14} color="#1FA64A" />
            </View>
            <Text style={styles.statLabel}>Received</Text>
          </View>
          <Text style={styles.statValue}>{formatKsh(received)}</Text>
        </View>

        <View style={styles.statBlock}>
          <View style={styles.statHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Ionicons name="arrow-up" size={14} color="#D6393F" />
            </View>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <Text style={styles.statValue}>{formatKsh(spent)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  label: {
    color: '#E4E0FB',
    fontSize: 14,
    textAlign: 'center',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#E4E0FB',
    fontSize: 13,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginTop: 4,
  },
});