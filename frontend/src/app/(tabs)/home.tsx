import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/app-text';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BalanceCard } from '@/components/home/balance-card';
import { BillsCarousel } from '@/components/home/bill-carousel';
import { TransactionRow } from '@/components/home/transaction-row';
import { ScrollEdgeFade } from '@/components/shared/scroll-edge-fade';
import { SlideInView } from '@/components/shared/slide-in-view';
import { PAGE_BACKGROUND } from '@/constants/colors';
import { getDb } from '@/lib/db/database';
import { listSims, type Sim } from '@/lib/db/sims';
import {
  listTransactions,
  totalsBetween,
  type StoredTransaction,
  type Totals,
} from '@/lib/db/transactions';
import { transactionTitle } from '@/lib/display';
import { periodBounds } from '@/lib/period';
import { formatSigned } from '@/lib/sms/money';
import { formatStamp } from '@/lib/time';
import { useDataStore } from '@/stores/data-store';
import { useSettingsStore } from '@/stores/settings-store';

// Placeholder data — shaped to match the backend HomeSummarySchema.
// Swap for a real fetch once the API client exists.
const RECENT_COUNT = 10;
const NO_TOTALS: Totals = { incomeCents: 0, expenseCents: 0, savingsCents: 0 };

const INSIGHTS_HEIGHT = 76;
const ICON_CENTER_FROM_RIGHT = 65;

// concentric rings radiating from behind the star icon
const INSIGHT_RIPPLES = [100, 160, 220, 280].map((d, i) => ({
  width: d,
  height: d,
  borderRadius: d / 2,
  top: INSIGHTS_HEIGHT / 2 - d / 2,
  right: ICON_CENTER_FROM_RIGHT - d / 2,
  opacity: 0.22 - i * 0.04,
}));

// big circles pushed down so only their top arcs show: overlapping wave crests
const INSIGHT_WAVES = [
  { size: 170, left: -50, top: 52, opacity: 0.22 },
  { size: 210, left: 20, top: 46, opacity: 0.16 },
  { size: 190, left: 120, top: 56, opacity: 0.2 },
].map(({ size, left, top, opacity }) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  left,
  top,
  opacity,
}));

// x positions of the slanted hairlines
const INSIGHT_LINES = Array.from({ length: 8 }, (_, i) => i * 32 - 20);

type UpcomingBill = {
  bill_name: string;
  amount: number;
  days_remaining: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
};

const UPCOMING_BILLS: { upcoming_bills: UpcomingBill[] } = {
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
  const [sims, setSims] = useState<Sim[]>([]);
  // Refresh on new import
  const dataVersion = useDataStore((s) => s.version);
  const simKey = useSettingsStore((s) => s.activeSim);

  // reload each time the screen is focused, so new transactions show up
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const db = await getDb();
        const { from, to } = periodBounds(period);
        
        const [t, r, availableSims] = await Promise.all([
          totalsBetween(db, from, to, simKey),
          listTransactions(db, { limit: RECENT_COUNT, simKey }),
          listSims(db),
        ]);
        if (!cancelled) {
          setTotals(t);
          setRecent(r);
          setSims(availableSims);
        }
      })().catch((e) => console.warn('home load failed', e));
      return () => {
        cancelled = true;
      };
    }, [period, simKey, dataVersion])
  );

  return { totals, recent, sims };
}

export default function HomeScreen() {
  const router = useRouter();
 
  const { totals, recent, sims } = useHomeData();
  const limitCents = useSettingsStore((s) => s.spendingLimitCents);
  const activeSim = useSettingsStore((s) => s.activeSim);
  const setActiveSim = useSettingsStore((s) => s.setActiveSim);
  // budget balance = what's left of the limit; negative means over budget
  const balanceCents = limitCents === null ? null : limitCents - totals.expenseCents;
      
  const sortedUpcomingBills = [...UPCOMING_BILLS.upcoming_bills].sort(
    (a, b) => a.days_remaining - b.days_remaining
  );

  return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <Animated.ScrollView contentContainerStyle={styles.scrollContent}>
          <BalanceCard
            balance={balanceCents}
            received={totals.incomeCents}
            spent={totals.expenseCents}
            sims={sims}
            activeSim={activeSim}
            onChangeSim={setActiveSim}
            onPressBalance={limitCents === null ? () => router.navigate('/budget') : undefined}
          />
          <View style={styles.pageContent}>
            {/**<SlideInView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Get AI insights"
                onPress={() => router.navigate('/insights')}
                style={({ pressed }) => [styles.insightsShadow, pressed && styles.insightsPressed]}
              >
                <View style={styles.insightsBanner}>
                  <LinearGradient
                    colors={['#6A3FE8', '#4A2BE8', '#2F63F5']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* white texture, purely decorative so touches pass through 
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
                      style={styles.insightsGloss}
                    />
                    {INSIGHT_LINES.map((left) => (
                      <View key={`line-${left}`} style={[styles.insightsLine, { left }]} />
                    ))}
                    {INSIGHT_WAVES.map((wave, i) => (
                      <View key={`wave-${i}`} style={[styles.insightsRing, wave]} />
                    ))}
                    {INSIGHT_RIPPLES.map((ripple, i) => (
                      <View key={`ripple-${i}`} style={[styles.insightsRing, ripple]} />
                    ))}
                  </View>

                  <Text variant="heading" style={styles.insightsTitle}>
                    Get AI Insights
                  </Text>

                  <View style={styles.insightsAction}>
                    <View style={styles.insightsIcon}>
                      <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </Pressable>
            </SlideInView> */}
            <SlideInView>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text variant="heading" style={styles.sectionTitle}>Upcoming Bills</Text>

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
                  <Text variant="heading" style={styles.sectionTitle}>Recent Transactions</Text>

                  <Link href="/all-transactions" asChild>
                    <TouchableOpacity>
                      <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                  </Link>
                </View>

                <View style={styles.transactionsSection}>
                  {recent.length === 0 ? (
                    <Text style={styles.empty}>No transactions yet.</Text>
                  ) : (
                    <ScrollEdgeFade
                      height={300}
                      contentContainerStyle={styles.transactionListContent}
                    >
                      {recent.map((tx) => {
                        // const amountColor =
                        //   tx.type === 'income' ? '#1FA64A' :
                        //   tx.type === 'expense' ? '#d3686c' : '#67627fa9';
                        return (
                          <TransactionRow
                            key={tx.id}
                            merchantName={transactionTitle(tx)}
                            timestamp={formatStamp(tx.occurredAt)}
                            amountText={formatSigned(tx.type, tx.amountCents)}
                            // amountColor={amountColor}
                            type={tx.type}
                          />
                        );
                      })}
                    </ScrollEdgeFade>
                  )}
                </View>
              </View>
            </SlideInView>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  pageContent: {
    flexGrow: 1,
    gap: 15,
    paddingHorizontal: 16,
    paddingTop: 33,
    paddingBottom: 100,
    marginTop: -28,
  },
  // Shared wrapper for both major content sections.
  section: {
    width: '100%',
    // paddingVertical: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    paddingVertical: 15
  },
    // AI insights banner
  insightsShadow: {
    // shadow lives here because the banner below clips its children (overflow: hidden)
    borderRadius: 20,
    boxShadow: '0px 8px 18px rgba(56, 31, 222, 0.28)',
  },
  insightsPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  insightsBanner: {
    height: 40,
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#4A2BE8', // shows for a frame before the gradient paints
  },
  insightsGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  insightsLine: {
    position: 'absolute',
    top: -50,
    width: 1,
    height: INSIGHTS_HEIGHT + 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '32deg' }],
  },
  insightsRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#FFFFFF', // opacity is set per ring, so only the outline fades
  },
  insightsTitle: {
    fontSize: 17,
    color: '#FFFFFF',
  },
  insightsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#08021a',
  },
  seeAll: {
    fontSize: 13,
    color: '#666666',
  },
  empty: {
    alignSelf: 'center'
  },
  transactionsSection: {
    // backgroundColor: 'black',
    minHeight: 300,
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
  },

  transactionList: {
    minHeight: 190,
    flexGrow: 0,
  },
  transactionListContent: {
    paddingBottom: 80,
    // backgroundColor: 'yellow',
  },
});