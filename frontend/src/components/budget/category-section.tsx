import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { JiggleCard } from './jiggle-card';
import { JiggableHeader } from './jiggable-header';
import { AddBudgetCard } from './add-budget-card';
import type { BudgetItem } from './budget-data';

type Props = {
  title: string;
  total: string;
  items: BudgetItem[];
  editMode: boolean;
  index: number;
  onItemPress: (item: BudgetItem) => void;
  onAddPress: () => void;
  onTitlePress: () => void;
};

export function CategorySection({ title, total, items, editMode, index, onItemPress, onTitlePress, onAddPress }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <JiggableHeader 
          title={title} 
          editMode={editMode} 
          index={index} 
          onPress={onTitlePress} 
        />
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
        {editMode && (
          <AddBudgetCard onPress={onAddPress} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  // sectionTitle: { fontWeight: '700', fontSize: 15, fontStyle: 'italic' },
  sectionTotal: { fontWeight: '600', fontSize: 13, color: '#333' },
});