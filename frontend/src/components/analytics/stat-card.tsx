import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: [string, string];
  progressPercent?: number;

  // Per-card style overrides
  cardStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  progressTrackStyle?: StyleProp<ViewStyle>;
  progressFillStyle?: StyleProp<ViewStyle>;
  progressLabelStyle?: StyleProp<TextStyle>;
};

export function StatCard({
  icon,
  label,
  value,
  colors,
  progressPercent,
  cardStyle,
  labelStyle,
  valueStyle,
  progressTrackStyle,
  progressFillStyle,
  progressLabelStyle,
}: Props) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, cardStyle]}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={14} color="#333" />
        </View>

        <Text style={[styles.label, labelStyle]}>{label}</Text>
      </View>

      <Text style={[styles.value, valueStyle]}>{value}</Text>

      {progressPercent !== undefined && (
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, progressTrackStyle]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
                progressFillStyle,
              ]}
            />
          </View>

          <Text style={[styles.progressLabel, progressLabelStyle]}>
            {progressPercent}%
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    fontSize: 15,
    color: '#1A1A1A',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});