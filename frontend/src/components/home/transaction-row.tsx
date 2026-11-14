import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

type TransactionType = 'income' | 'expense' | 'savings';

type Props = {
  merchantName: string;
  timestamp: string; // pre-formatted, e.g. "Wednesday, 10:15 AM"
  amountText: string;
  amountColor?: string;
  type: TransactionType;
};

const PALETTE: Record<TransactionType, { icon: string; tint: string }> = {
  income: { icon: '#33f016bd', tint: 'rgba(120, 255, 125, 0.17)' },
  expense: { icon: '#1642f0bd', tint: 'rgba(120, 174, 255, 0.17)' },
  savings: { icon: '#67627F', tint: 'rgba(103, 98, 127, 0.12)' },
};

// Positive = clockwise. Income points down-right (in), expense up-right (out).
const ROTATION: Record<TransactionType, string> = {
  income: '-320deg',
  expense: '320deg',
  savings: '0deg',
};

export function TransactionRow({
  merchantName,
  timestamp,
  amountText,
  amountColor,
  type,
}: Props) {
  const { icon, tint } = PALETTE[type];

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.left}>
          {/* Frosted glass icon */}
          <View style={styles.iconWrapper}>
            <BlurView intensity={100} tint="systemMaterial" tintColor="rgba(0, 0, 0, 0.2)" style={styles.blur}>
              {/* Colour tint over the blur */}
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: tint }]}
              />
              <Ionicons
                name="arrow-forward"
                size={15}
                color={icon}
                style={{ transform: [{ rotate: ROTATION[type] }] }}
              />
            </BlurView>
          </View>

          {/* Transaction details */}
          <View style={styles.textContainer}>
            <Text style={styles.merchant} numberOfLines={1}>
              {merchantName}
            </Text>
            <Text style={styles.timestamp}>{timestamp}</Text>
          </View>
        </View>

        <Text style={[styles.amount, amountColor ? { color: amountColor } : null]}>
          {amountText}
        </Text>

      </View>
      <LinearGradient
        colors={[
          'transparent',
          'rgba(21, 15, 99, 0.06)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.divider}
      />
  </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 5,
    marginBottom: 5,
    gap: 10,
  },
  divider: {
    height: 1,
    // marginHorizontal: 5,
    // marginVertical: 0,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  merchant: {
    fontWeight: '600',
    fontSize: 12,
    color: '#060314',
    fontFamily: 'IBMPlexMono_400Regular',
  },
  timestamp: {
    fontSize: 10,
    color: '#67627fa9',
    marginTop: 2,
  },
  amount: {
    fontSize: 12,
    fontFamily: 'IBMPlexMono_400Regular',
    fontWeight: '600',
    marginLeft: 8,
  },
});