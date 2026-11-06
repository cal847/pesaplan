import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import React from 'react';

import { formatKsh } from '@/lib/sms/money'; 

type Props = {
  balance: number | null;
  // caption?: string;
  received: number;
  spent: number;
};



export function BalanceCard({ balance, received, spent, caption }: Props) {
  const shineX = useSharedValue(-120);

  React.useEffect(() => {
    shineX.value = withRepeat(
      withSequence(
        withTiming(420, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withDelay(
          5000,
          withTiming(-120, {
            duration: 0,
          }),
        ),
      ),
      -1,
      false,
    );
  }, []);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shineX.value },
      { rotate: '-25deg' },
    ],
  }));

  return (
    <LinearGradient
      colors={['#381FDE', '#8072dd', '#6F61CD', '#381EEA']}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.card}>
        <Animated.View style={[styles.shine, shineStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255,255,255,0.08)',
              'rgba(255,255,255,0.20)',
              'rgba(255,255,255,0.08)',
              'transparent',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shineGradient}
          />
        </Animated.View>

      <Text style={styles.label}>Budget Balance</Text>
      <Text style={styles.balance}>
        {balance === null ? 'Add your budget' : formatKsh(balance)}
      </Text>
      {/* {caption? <Text>{caption}</Text> : null} */}

      <View style={styles.row}>
        <View style={styles.statBlock}>
          <View style={styles.statHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Ionicons name="arrow-down" size={14} color="#1FA64A" style={{ transform: [{ rotate: '-320deg' }] }} />
            </View>
            <Text style={styles.statLabel}>Received</Text>
          </View>
          <Text style={styles.statValue}>{formatKsh(received)}</Text>
        </View>

        <View style={styles.statBlock}>
          <View style={styles.statHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
              <Ionicons name="arrow-up" size={14} color="#D6393F" style={{ transform: [{ rotate: '40deg' }] }} />
            </View>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <Text style={styles.statValue}>{formatKsh(spent)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    minHeight: 180,
    overflow: 'hidden',
    boxShadow: '0px 2px 4px rgba(14, 39, 178, 0.54)',
  },
  shine: {
    position: 'absolute',
    top: -40,
    left: -60,
    width: 60,
    height: '160%',
  },

  shineGradient: {
    flex: 1,
  },
  label: {
    color: '#E4E0FB',
    fontSize: 14,
    textAlign: 'center',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#E4E0FB',
    fontSize: 13,
  },
  statValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    marginTop: 4,
  },
});