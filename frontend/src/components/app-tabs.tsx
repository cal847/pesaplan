import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const ACTIVE_COLOR = '#4B0082';
const INACTIVE_COLOR = '#8B7FE0';

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return (
  <View style={styles.normalIcon}>
    <Ionicons name={name} size={20} color={focused ? ACTIVE_COLOR : INACTIVE_COLOR} />
  </View>);
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}>
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          // styled as the elevated "+" circle, but navigates like a normal tab now
          tabBarIcon: ({ focused }) => (
            <View style={[styles.fab, focused && styles.fabFocused]}>
              <Ionicons name="add" size={30} color="#4B0082" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="golf-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="person-outline" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#E4E0FB',
    borderRadius: 30,
    marginHorizontal: 24,
    marginBottom: 30,
    height: 60,
    borderTopWidth: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  item: { 
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    height: '58%',
  },
  normalIcon: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    backgroundColor: '#fff',
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: '#4B0082',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
    shadowColor: '#3F2FD6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabFocused: { borderWidth: 3, borderColor: '#C9BFFF' },
});