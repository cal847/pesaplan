import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionPill } from '@/components/transactions/transaction-pill';

// TODO: Replace with GET /api/v1/transactions when the API client is ready.
const MOCK_TRANSACTIONS = [
  { merchant: 'Funtimes', date: 'Wednesday, 10:15 AM', amount: 30.0 },
  { merchant: 'Magunas', date: 'Yesterday, 12:14 PM', amount: 381.4 },
  { merchant: 'Shoppers Delight Minimart', date: '14/5, 9:33 AM', amount: 30.0 },
  { merchant: 'KPLC Prepaid', date: '11/5, 8:55 PM', amount: 50.0 },
];

export default function AllTransactionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>

        <Text style={styles.title}>Transactions</Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#999999" />

        <TextInput
          placeholder="Search recent transactions..."
          placeholderTextColor="#999999"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={MOCK_TRANSACTIONS}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TransactionPill
            merchantName={item.merchant}
            date={item.date}
            amount={item.amount}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F6FB',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backButton: {
    width: 22,
    alignItems: 'flex-start',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  headerSpacer: {
    width: 22,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1A1A1A',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  separator: {
    height: 6,
  },
});
