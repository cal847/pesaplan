import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionPill } from '@/components/transactions/transaction-pill';
import { getDb } from '@/lib/db/database';
import { listTransactions, StoredTransaction } from '@/lib/db/transactions';
import { transactionTitle } from '@/lib/display';
import { formatSigned } from '@/lib/sms/money';
import { formatStamp } from '@/lib/time';

const PAGE = 30;

export default function AllTransactionsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<StoredTransaction[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const offset = useRef(0);
  const loading = useRef(false);

  const loadPage = useCallback(async (reset: boolean) => {
    if (loading.current) return;
    loading.current = true;
    try {
      if (reset) offset.current = 0;
      const page = await listTransactions(await getDb(), { limit: PAGE, offset: offset.current });
      offset.current += page.length;
      setRows((prev) => (reset ? page : [...prev, ...page]));
      setExhausted(page.length < PAGE);
    } finally {
      loading.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPage(true).catch((e) => console.warn('transactions load failed', e));
    }, [loadPage])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Transactions</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!exhausted) loadPage(false).catch((e) => console.warn('page load failed', e));
        }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
        renderItem={({ item }) => (
          <TransactionPill
            merchantName={transactionTitle(item)}
            date={formatStamp(item.occurredAt)}
            amountText={formatSigned(item.type, item.amountCents)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F6FB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { color: '#666666', textAlign: 'center', marginTop: 40 },
});