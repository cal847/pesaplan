// frontend/src/components/budget/category-section.tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { JiggleCard } from './jiggle-card';

type BudgetItem = { icon: string; name: string; amount: string; backgroundColor: string };

type Props = {
  title: string;
  total: string;
  items: BudgetItem[];
  editMode: boolean;
  onItemPress: (item: BudgetItem) => void;
};

export function CategorySection({ title, total, items, editMode, onItemPress }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionTotal}>{total}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item, i) => (
          <JiggleCard
            key={item.name}
            icon={item.icon}
            name={item.name}
            amount={item.amount}
            backgroundColor={item.backgroundColor}
            editMode={editMode}
            index={i}
            onPress={() => onItemPress(item)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontWeight: '700', fontSize: 15, fontStyle: 'italic' },
  sectionTotal: { fontWeight: '600', fontSize: 13, color: '#333' },
});