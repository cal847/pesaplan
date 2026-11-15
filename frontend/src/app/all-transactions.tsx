import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/app-text';
import {
  CustomDateRangePicker,
  type SelectedDateRange,
} from '@/components/transactions/custom-date-range-picker';
import { TransactionPill } from '@/components/transactions/transaction-pill';
import { getDb } from '@/lib/db/database';
import { listTransactions, type StoredTransaction } from '@/lib/db/transactions';
import { transactionTitle } from '@/lib/display';
import { periodBounds } from '@/lib/period';
import { formatKsh } from '@/lib/sms/money';
import { formatStamp, formatTransactionGroupDate, toLocalStamp } from '@/lib/time';

const PAGE = 30;

const FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom range' },
  // { id: 'all', label: 'All Time' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];
type ActiveFilter = FilterId | 'all';

type TransactionSection = {
  key: string;
  title: string;
  data: StoredTransaction[];
};
type Query = { from: string; to: string; search: string };

function getBounds(filter: ActiveFilter, range: SelectedDateRange | null) {
  if (filter === 'today') return periodBounds('Daily');
  if (filter === 'month') return periodBounds('Monthly');
  if (filter === 'year') return periodBounds('Yearly');
  if (filter === 'all') {
    return {
      from: '1970-01-01T00:00:00',
      to: '9999-12-31T23:59:59',
    };
    }
  if (!range) return periodBounds('Monthly');

  const from = new Date(
    range.from.getFullYear(),
    range.from.getMonth(),
    range.from.getDate()
  );
  const to = new Date(
    range.to.getFullYear(),
    range.to.getMonth(),
    range.to.getDate() + 1
  );
  return { from: toLocalStamp(from), to: toLocalStamp(to) };
}

function groupByDate(rows: StoredTransaction[]): TransactionSection[] {
  const groups = new Map<string, StoredTransaction[]>();
  for (const row of rows) {
    const key = row.occurredAt.slice(0, 10);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  return Array.from(groups, ([key, data]) => ({
    key,
    title: formatTransactionGroupDate(`${key}T00:00`),
    data,
  }));
}

function transactionAmount(item: StoredTransaction) {
  const sign = item.type === 'income' ? '+' : '−';
  return `${sign}${formatKsh(item.amountCents)}`;
}

function transactionAmountColor(item: StoredTransaction) {
  return item.type === 'income' ? '#23834A' : '#34313A';
}

export default function AllTransactionsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<StoredTransaction[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<ActiveFilter>('all');
  const [customRange, setCustomRange] = useState<SelectedDateRange | null>(null);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const offset = useRef(0);
  const requestVersion = useRef(0);
  const loadingRef = useRef(false);
  const pendingReset = useRef(false);
  const screenActive = useRef(false);
  const isFilterMode = filter !== 'all';

  const query = useMemo<Query>(() => {
    const bounds = getBounds(filter, customRange);
    return { ...bounds, search: searchText.trim() };
  }, [filter, customRange, searchText]);
  const queryKey = `${query.from}|${query.to}|${query.search}`;
  const queryRef = useRef(query);
  queryRef.current = query;

  const sections = useMemo(() => groupByDate(rows), [rows]);

  const loadPage = useCallback(async (reset: boolean) => {
    if (loadingRef.current) {
      if (reset) pendingReset.current = true;
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    const version = requestVersion.current;
    const pageOffset = reset ? 0 : offset.current;
    const currentQuery = queryRef.current;

    try {
      const page = await listTransactions(await getDb(), {
        limit: PAGE,
        offset: pageOffset,
        from: currentQuery.from,
        to: currentQuery.to,
        search: currentQuery.search,
      });

      if (version === requestVersion.current) {
        offset.current = pageOffset + page.length;
        setRows((current) => (reset ? page : [...current, ...page]));
        setExhausted(page.length < PAGE);
        setLoadError(false);
      }
    } catch (error) {
      if (version === requestVersion.current) {
        console.warn('transactions load failed', error);
        setLoadError(true);
        setExhausted(true);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);

      if (pendingReset.current) {
        pendingReset.current = false;
        if (screenActive.current) {
          offset.current = 0;
          setRows([]);
          setExhausted(false);
          setLoadError(false);
          void loadPage(true);
        }
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      screenActive.current = true;
      requestVersion.current += 1;
      offset.current = 0;
      setRows([]);
      setExhausted(false);
      setLoadError(false);
      void loadPage(true);

      return () => {
        screenActive.current = false;
        requestVersion.current += 1;
      };
    }, [loadPage, queryKey])
  );

  function chooseFilter(next: FilterId) {
    if (next === 'custom') {
      if (filter === 'custom') {
        setFilter('all');
        return;
      }
      setRangePickerOpen(true);
    }
    setFilter(current => current === next ? 'all' : next);
  }

  function closeSearch() {
    setSearchText('');
    setSearchOpen(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color="#231D35" />
        </TouchableOpacity>
        <Text variant="heading" style={styles.title}>Transactions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.filters,
          {marginTop: 15}
        ]}
      >
        {FILTERS.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.id }}
            onPress={() => chooseFilter(item.id)}
            style={[styles.filterPill, filter === item.id && styles.filterPillActive]}
          >
            <Text
              style={[styles.filterText, filter === item.id && styles.filterTextActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={searchOpen ? 'Close search' : 'Search transactions'}
          onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          style={styles.searchButton}
        >
          <Ionicons
            name={searchOpen ? 'close' : 'search'}
            size={20}
            color="#4F35AE"
          />
        </Pressable>
      </ScrollView>

      {searchOpen && (
        <View style={styles.searchField}>
          <Ionicons name="search" size={18} color="#7C748D" />
          <TextInput
            autoFocus
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search merchant or code"
            placeholderTextColor="#918B9D"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#918B9D" />
            </Pressable>
          )}
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text variant="heading" style={styles.dateHeading}>{section.title}</Text>
        )}
        renderItem={({ item, index, section}) => (
          <TransactionPill
            merchantName={transactionTitle(item)}
            date={formatStamp(item.occurredAt)}
            code={item.code ?? (item.source === 'manual' ? 'Manual transaction' : 'No code')}
            amountText={transactionAmount(item)}
            amountColor={transactionAmountColor(item)}
            isLast={index === section.data.length -1}
          />
        )}
        onEndReachedThreshold={0.45}
        onEndReached={() => {
          if (!exhausted && !loadingRef.current && rows.length > 0) {
            void loadPage(false);
          }
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color="#5D3BC8" />
            ) : (
              <Text style={styles.emptyText}>
                {loadError ? 'Could not load transactions.' : 'No transactions found.'}
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          loading && rows.length > 0 ? (
            <ActivityIndicator style={styles.footerLoader} color="#5D3BC8" />
          ) : null
        }
      />

      <CustomDateRangePicker
        visible={rangePickerOpen}
        initialRange={customRange}
        onCancel={() => setRangePickerOpen(false)}
        onDone={(range) => {
          setCustomRange(range);
          setFilter('custom');
          setRangePickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerSpacer: {
    width: 32,
  },
  title: {
    fontSize: 18,
    color: '#211D2C',
  },
  filters: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: '#EAE5F8',
  },
  filterPillActive: {
    backgroundColor: '#5D3BC8',
  },
  filterText: {
    fontWeight: '500',
    fontSize: 11,
    color: '#4F35AE',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  searchButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#EAE5F8',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DDEC',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: '#211D2C',
    fontSize: 13,
  },
  listContent: {
    // flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  dateHeading: {
    paddingTop: 25,
    // paddingBottom: 4,
    color: '#5D3BC8',
    fontWeight: 600,
    fontSize: 17,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#777382',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 16,
  },
});
