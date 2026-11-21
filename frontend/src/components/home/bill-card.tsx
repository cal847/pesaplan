// frontend/src/components/home/bill-card.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView, BlurTargetView } from 'expo-blur';
import { useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';

type Props = {
  name: string;
  amount: number;
  daysLeft: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
};

export function BillCard({ name, amount, daysLeft, icon, iconColor, backgroundColor }: Props) {
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);

  return (
    <View style={[styles.card, { borderColor: backgroundColor }]}>
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
        <View style={styles.backdropGlow} />
      </BlurTargetView>
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={45}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name={icon} size={16} color={iconColor} />
          <Text style={[styles.name, { color: iconColor }]}>{name}</Text>
        </View>
        <Text style={styles.amount}>Ksh {amount.toFixed(2)}</Text>
        <Text style={styles.daysLeft}>
          {daysLeft} {daysLeft === 1 ? 'Day' : 'Days'} Left
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 75,
    overflow: 'hidden',
  },
  backdropGlow: {
    position: 'absolute',
    top: -34,
    right: -24,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  content: {
    flex: 1,
    padding: 9,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontWeight: '700',
    fontSize: 12,
    flexShrink: 1,
  },
  amount: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '600',
  },
  daysLeft: {
    fontSize: 11,
    color: '#555555',
  },
});