import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { TransactionPill } from '@/components/transactions/transaction-pill';
import { ALL_TIME_RANGE, PeriodFilters, type DateRange } from '@/components/ui/period-filters';
import {
  useDebounced,
  useTransactionList,
} from '@/hooks/use-transaction-list';
import { type StoredTransaction } from '@/lib/db/transactions';
import { transactionTitle } from '@/lib/display';
import { formatKsh } from '@/lib/sms/money';
import {
  formatStamp,
  formatTransactionGroupDate,
} from '@/lib/time';
import { useSettingsStore } from '@/stores/settings-store';

type TransactionSection = {
  key: string;
  title: string;
  data: StoredTransaction[];
};

function groupByDate(
  rows: StoredTransaction[]
): TransactionSection[] {
  const groups = new Map<string, StoredTransaction[]>();

  for (const row of rows) {
    const key = row.occurredAt.slice(0, 10);
    const group = groups.get(key);

    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
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

  const [range, setRange] = useState<DateRange>( ALL_TIME_RANGE );

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const search = useDebounced(searchText.trim());
  const activeSim = useSettingsStore((s) => s.activeSim);

  const {
    rows,
    status,
    refreshing,
    loadingMore,
    loadMore,
    retry,
    exhausted,
  } = useTransactionList(range, search, activeSim);

  const isLoading = status === 'loading' || refreshing;
  const hasError = status === 'error';
  const sections = useMemo(() => groupByDate(rows), [rows]);

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

        <Text variant="heading" style={styles.title}>
          Transactions
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        horizontal
        style={{ flexGrow: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { marginTop: 15 }]}
      >
        <PeriodFilters
          initialFilter="all"
          onRangeChange={setRange}
          containerStyle={{ paddingBottom: 0 }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            searchOpen ? 'Close search' : 'Search transactions'
          }
          onPress={() =>
            searchOpen ? closeSearch() : setSearchOpen(true)
          }
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
            <Pressable
              onPress={() => setSearchText('')}
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#918B9D"
              />
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
          <Text variant="heading" style={styles.dateHeading}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <TransactionPill
            merchantName={transactionTitle(item)}
            date={formatStamp(item.occurredAt)}
            code={
              item.code ??
              (item.source === 'manual'
                ? 'Manual transaction'
                : 'No code')
            }
            amountText={transactionAmount(item)}
            amountColor={transactionAmountColor(item)}
            isLast={index === section.data.length - 1}
          />
        )}
        onEndReachedThreshold={0.45}
        onEndReached={() => {
          if (!exhausted) loadMore();
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? (
              <ActivityIndicator color="#5D3BC8" />
            ) : (
              <View>
                <Text style={styles.emptyText}>
                  {hasError
                    ? 'Could not load transactions.'
                    : 'No transactions found.'}
                </Text>

                {hasError && (
                  <Pressable
                    onPress={retry}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>
                      Tap to retry
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={styles.footerLoader}
              color="#5D3BC8"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  dateHeading: {
    paddingTop: 25,
    color: '#5D3BC8',
    fontWeight: '600',
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
  retryButton: {
    marginTop: 10,
  },
  retryText: {
    color: '#5D3BC8',
    fontWeight: '600',
  },
});