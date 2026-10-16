import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { AmbientBackground } from '@/components/shared/ambient-background';
import { BalanceCard } from '@/components/home/balance-card';
import { TransactionRow } from '@/components/home/transaction-row';
import { BillsCarousel } from '@/components/home/bill-carousel';
import { SlideInView } from '@/components/shared/slide-in-view';
import { ScrollEdgeFade } from '@/components/shared/scroll-edge-fade';
import { getDb } from '@/lib/db/database';
import { listTransactions, totalsBetween, StoredTransaction, Totals } from '@/lib/db/transactions';
import { TYPE_EMOJI, transactionTitle } from '@/lib/display';
import { PERIOD_CAPTION, periodBounds } from '@/lib/period';
import { formatKsh, formatSigned } from '@/lib/sms/money';
import { formatStamp } from '@/lib/time';
import { useSettingsStore } from '@/stores/settings-store';

// Placeholder data — shaped to match the backend HomeSummarySchema.
// Swap for a real fetch once the API client exists.
const RECENT_COUNT = 10;
const NO_TOTALS: Totals = { incomeCents: 0, expenseCents: 0, savingsCents: 0 };

const UPCOMING_BILLS = {
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
  ]
};

function useHomeData() {
  const period = useSettingsStore((s) => s.spendingPeriod);
  const [totals, setTotals] = useState<Totals>(NO_TOTALS);
  const [recent, setRecent] = useState<StoredTransaction[]>([]);

  // reload each time the screen is focused, so new transactions show up
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const db = await getDb();
        const { from, to } = periodBounds(period);
        const [t, r] = await Promise.all([
          totalsBetween(db, from, to),
          listTransactions(db, { limit: RECENT_COUNT }),
        ]);
        if (!cancelled) {
          setTotals(t);
          setRecent(r);
        }
      })().catch((e) => console.warn('home load failed', e));
      return () => {
        cancelled = true;
      };
    }, [period])
  );

  return { totals, recent };
}

export default function HomeScreen() {
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const { totals, recent } = useHomeData();
  const period = useSettingsStore((s) => s.spendingPeriod);
  const limitCents = useSettingsStore((s) => s.spendingLimitCents);

  // budget balance = what's left of the limit; negative means over budget
  const balanceCents = limitCents === null ? null : limitCents - totals.expenseCents;
      
  const sortedUpcomingBills = [...UPCOMING_BILLS.upcoming_bills].sort(
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
            {/* with no limit set, tapping the card goes to Budget to set one */}
            <Pressable disabled={limitCents !== null} onPress={() => router.navigate('/budget')}>
              <BalanceCard
                balance={balanceCents}
                // caption={caption}
                received={totals.incomeCents}
                spent={totals.expenseCents}
              />
            </Pressable>
          </SlideInView>

          <SlideInView>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Upcoming Bills & Subscriptions
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
                { recent.length === 0? (
                  <Text style={styles.empty}>No transactions yet.</Text>
                ) : (
                  <ScrollEdgeFade
                    height={190}
                    fadeHeight={24}
                    color="100, 100, 100"
                    contentContainerStyle={styles.transactionListContent}>
                    {recent.map((tx) => (
                      <TransactionRow
                        key={tx.id}
                        merchantName={transactionTitle(tx)}
                        timestamp={formatStamp(tx.occurredAt)}
                        amountText={formatSigned(tx.type, tx.amountCents)}
                        emoji={TYPE_EMOJI[tx.type]}
                      />
                    ))}
                  </ScrollEdgeFade>
                )}
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