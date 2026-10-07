import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubscriptionRow } from '@/components/subscriptions/subscription-row';

// Placeholder — swap for GET /api/v1/home/bills/all once the client exists
const MOCK_SUBSCRIPTIONS = [
  { name: 'Youtube', dueDate: 'Due in 2 days', amount: 213.42 },
  { name: 'Spotify', dueDate: 'Due in 1 day', amount: 179.0 },
  { name: 'Netflix', dueDate: 'Due in 5 days', amount: 1200.0 },
  { name: 'KPLC Prepaid', dueDate: 'Due in 3 days', amount: 3000.0 },
];

export default function AllSubscriptionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
        onPress={() => {
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/');
            }
        }}
        style={styles.backButton}
        accessibilityLabel="Go back"
        >
    <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Subscriptions</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={MOCK_SUBSCRIPTIONS}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <SubscriptionRow name={item.name} dueDate={item.dueDate} amount={item.amount} />
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
  listContent: { paddingHorizontal: 16 },
  separator: { height: 1, backgroundColor: '#E5E3F0' },
});