import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/home/balance-card';
import { TransactionRow } from '@/components/home/transaction-row';
import { BillsCarousel } from '@/components/home/bill-carousel';

// Placeholder data — shaped to match the backend HomeSummarySchema.
// Swap for a real fetch once the API client exists.
const MOCK_DATA = {
  balance: { net_balance: 21324.49, total_income: 2183.09, total_expenses: 2183.09 },
  upcoming_bills: [
    {
      bill_name: 'Youtube',
      amount: 213.42,
      days_remaining: 14,
      icon: 'logo-youtube',
      iconColor: '#C0392B',
      backgroundColor: '#F3D9D7',
    },
    {
      bill_name: 'Spotify',
      amount: 179.0,
      days_remaining: 10,
      icon: 'musical-notes',
      iconColor: '#1B6E3C',
      backgroundColor: '#D6EFDD',
    },
    {
      bill_name: 'Netflix',
      amount: 499.0,
      days_remaining: 21,
      icon: 'play-circle',
      iconColor: '#B71C1C',
      backgroundColor: '#F4D6D6',
    },
    {
      bill_name: 'KPLC',
      amount: 850.0,
      days_remaining: 30,
      icon: 'flash',
      iconColor: '#8A6D1D',
      backgroundColor: '#F3E8BE',
    },
  ],
  recent_transactions: [
    { merchant_name: 'Funtimes', transaction_date: 'Wednesday, 10:15 AM', amount: 30.0 },
    { merchant_name: 'Magunas', transaction_date: 'Yesterday, 12:14 PM', amount: 381.4 },
  ],
};

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, User!!</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#999999" />
          <TextInput
            placeholder="Search Recent Transactions..."
            placeholderTextColor="#999999"
            style={styles.searchInput}
          />
        </View>

        <BalanceCard
          balance={MOCK_DATA.balance.net_balance}
          received={MOCK_DATA.balance.total_income}
          spent={MOCK_DATA.balance.total_expenses}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Subscriptions</Text>
          <Link href="/all-subscriptions" asChild>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <BillsCarousel bills={MOCK_DATA.upcoming_bills} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Link href="/all-transactions" asChild>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {MOCK_DATA.recent_transactions.map((tx, i) => (
          <TransactionRow
            key={i}
            merchantName={tx.merchant_name}
            timestamp={tx.transaction_date}
            amount={tx.amount}
            emoji={i === 0 ? '🎪' : '🛒'}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6FB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // extra room so content clears the floating tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3F2FD6',
    textDecorationLine: 'underline',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAll: {
    fontSize: 13,
    color: '#666666',
  },
});