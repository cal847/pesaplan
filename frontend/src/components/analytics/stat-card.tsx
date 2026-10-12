import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: [string, string];
  progressPercent?: number; // 0-100, omit for no progress bar
};

export function StatCard({ icon, label, value, colors, progressPercent }: Props) {
  return (
    <LinearGradient colors={colors} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={14} color="#333" />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>

      {progressPercent !== undefined && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressPercent}%</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 18, padding: 16, minHeight: 110, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', fontSize: 13, color: '#1A1A1A' },
  value: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  progressTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: '#1A1A1A', borderRadius: 3 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#1A1A1A' },
});