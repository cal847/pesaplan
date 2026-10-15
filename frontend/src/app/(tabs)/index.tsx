import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { AmbientBackground } from '@/components/shared/ambient-background';
import { BalanceCard } from '@/components/home/balance-card';
import { TransactionRow } from '@/components/home/transaction-row';
import { BillsCarousel } from '@/components/home/bill-carousel';
import { SlideInView } from '@/components/shared/slide-in-view';
import { ScrollEdgeFade } from '@/components/shared/scroll-edge-fade';

// Placeholder data — shaped to match the backend HomeSummarySchema.
// Swap for a real fetch once the API client exists.
const MOCK_DATA = {
  balance: {
    net_balance: 21324.49,
    total_income: 2183.09,
    total_expenses: 2183.09,
  },
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
    {
      bill_name: 'Rent',
      amount: 213.42,
      days_remaining: 14,
      icon: 'logo-youtube',
      iconColor: '#C0392B',
      backgroundColor: '#F3D9D7',
    },
    {
      bill_name: 'Water',
      amount: 179.0,
      days_remaining: 10,
      icon: 'musical-notes',
      iconColor: '#1B6E3C',
      backgroundColor: '#D6EFDD',
    },
    {
      bill_name: 'Apple Music',
      amount: 499.0,
      days_remaining: 21,
      icon: 'play-circle',
      iconColor: '#B71C1C',
      backgroundColor: '#F4D6D6',
    },
    {
      bill_name: 'Wifi',
      amount: 850.0,
      days_remaining: 30,
      icon: 'flash',
      iconColor: '#8A6D1D',
      backgroundColor: '#F3E8BE',
    },
  ],
  recent_transactions: [
    {
      merchant_name: 'Funtimes',
      transaction_date: 'Wednesday, 10:15 AM',
      amount: 30.0,
    },
    {
      merchant_name: 'Magunas',
      transaction_date: 'Yesterday, 12:14 PM',
      amount: 381.4,
    },
    {
      merchant_name: 'Funtimes',
      transaction_date: 'Wednesday, 10:15 AM',
      amount: 30.0,
    },
    {
      merchant_name: 'Magunas',
      transaction_date: 'Yesterday, 12:14 PM',
      amount: 381.4,
    },
    {
      merchant_name: 'Funtimes',
      transaction_date: 'Wednesday, 10:15 AM',
      amount: 30.0,
    },
    {
      merchant_name: 'Magunas',
      transaction_date: 'Yesterday, 12:14 PM',
      amount: 381.4,
    },
    {
      merchant_name: 'Funtimes',
      transaction_date: 'Wednesday, 10:15 AM',
      amount: 30.0,
    },
    {
      merchant_name: 'Magunas',
      transaction_date: 'Yesterday, 12:14 PM',
      amount: 381.4,
    },
  ],
};

export default function HomeScreen() {
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const sortedUpcomingBills = [...MOCK_DATA.upcoming_bills].sort(
    (a, b) => a.days_remaining - b.days_remaining
  );

  return (
    <View style={styles.container}>
      <AmbientBackground scrollY={scrollY} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.greeting}>Hello, User!!</Text>

            <TouchableOpacity>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#07022A"
              />
            </TouchableOpacity>
          </View>

          <SlideInView>
            <BalanceCard
              balance={MOCK_DATA.balance.net_balance}
              received={MOCK_DATA.balance.total_income}
              spent={MOCK_DATA.balance.total_expenses}
            />
          </SlideInView>

          <SlideInView>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Upcoming Subscriptions
                </Text>

                <Link href="/all-subscriptions" asChild>
                  <TouchableOpacity>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <BillsCarousel bills={sortedUpcomingBills} />
            </View>
          </SlideInView>

          <SlideInView>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Recent Transactions
                </Text>

                <Link href="/all-transactions" asChild>
                  <TouchableOpacity>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <View style={styles.transactionsSection}>
                <ScrollEdgeFade
                  height={190}
                  fadeHeight={24}
                  color="100, 100, 100"
                  contentContainerStyle={styles.transactionListContent}
                >
                  {MOCK_DATA.recent_transactions.map((transaction, index) => (
                    <TransactionRow
                      key={`${transaction.merchant_name}-${index}`}
                      merchantName={transaction.merchant_name}
                      timestamp={transaction.transaction_date}
                      amount={transaction.amount}
                      emoji={index % 2 === 0 ? '🎪' : '🛒'}
                    />
                  ))}
                </ScrollEdgeFade>
              </View>
            </View>
          </SlideInView>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFDFE',
  },
  safeArea: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 15,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#07022A',
  },

  // Shared wrapper for both major content sections.
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  transactionsSection: {
    backgroundColor: '#f7f5fc',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    marginHorizontal: -9,
    borderColor: '#2B0C0C2F',
  },

  transactionList: {
    minHeight: 190,
    flexGrow: 0,
  },
  transactionListContent: {
    paddingBottom: 8,
  },
});