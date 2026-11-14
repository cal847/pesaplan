import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Sim } from '@/lib/db/sims';
import { formatKsh } from '@/lib/sms/money';

const MENU_WIDTH = 176;
const MENU_HEIGHT = 132;

type SimSelectorProps = {
  sims: Sim[];
  activeSim: string | null;
  onChange: (simKey: string | null) => void;
};

function SimSelector({ sims, activeSim, onChange }: SimSelectorProps) {
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);

  const active = sims.find((sim) => sim.simKey === activeSim);
  const label =
    activeSim === null
      ? 'All SIMs'
      : typeof active?.slot === 'number'
        ? `Sim ${active.slot + 1}`
        : 'Selected SIM';

  const menuStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, MENU_HEIGHT]),
    opacity: progress.value,
    borderRadius: interpolate(progress.value, [0, 1], [32, 18]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-14, 0]) },
      { scaleY: interpolate(progress.value, [0, 1], [0.78, 1]) },
    ],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  function setMenu(next: boolean) {
    setOpen(next);
    progress.value = withTiming(next ? 1 : 0, {
      duration: next ? 260 : 220,
      easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }

  function choose(simKey: string | null) {
    onChange(simKey);
    setMenu(false);
  }

  return (
    <View style={styles.simSelector}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Selected SIM: ${label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setMenu(!open)}
        style={styles.simToggle}
      >
        {/* equal side padding keeps the TEXT centred; the chevron floats on the right */}
        <Text style={styles.simToggleText}>{label}</Text>
        <Animated.View style={[styles.simChevron, arrowStyle]}>
          <Ionicons name="chevron-down" size={17} color="#FFFFFF" />
        </Animated.View>
      </Pressable>

      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.simMenu, menuStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeSim === null }}
          onPress={() => choose(null)}
          style={styles.simMenuOption}
        >
          <Text style={styles.simMenuText}>All SIMs</Text>
          {activeSim === null && <Ionicons name="checkmark" size={17} color="#34229B" />}
        </Pressable>

        {[0, 1].map((slot) => {
          const sim = sims.find((entry) => entry.slot === slot);
          const selected = !!sim && sim.simKey === activeSim;
          return (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityState={{ disabled: !sim, selected }}
              disabled={!sim}
              onPress={() => sim && choose(sim.simKey)}
              style={[styles.simMenuOption, !sim && styles.simMenuOptionDisabled]}
            >
              <Text style={[styles.simMenuText, !sim && styles.simMenuTextDisabled]}>
                Sim {slot + 1}
              </Text>
              {selected && <Ionicons name="checkmark" size={17} color="#34229B" />}
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

type Props = {
  name?: string;
  balance: number | null;
  received: number;
  spent: number;
  sims: Sim[];
  activeSim: string | null;
  onChangeSim: (simKey: string | null) => void;
  onPressNotifications?: () => void;
  /** Pass only while no budget is set, so the highlight acts as a "set budget" button */
  onPressBalance?: () => void;
};

export function BalanceCard({
  name = 'User',
  balance,
  received,
  spent,
  sims,
  activeSim,
  onChangeSim,
  onPressNotifications,
  onPressBalance,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const shineX = useSharedValue(-120);

  useEffect(() => {
    shineX.value = withRepeat(
      withSequence(
        withTiming(width + 120, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withDelay(5000, withTiming(-120, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shineX);
  }, [width, shineX]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineX.value }, { rotate: '-25deg' }],
  }));

  return (
    <View style={[styles.card, { minHeight: Math.round(height * 0.25) }]}>
      {/* the glossy gradient now fills the whole card, header included */}
      <LinearGradient
        colors={['#704DF5', '#5B52E7', '#3978DC', '#3D2BB8']}
        locations={[0, 0.33, 0.67, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* the shine sweeps the whole card, and never blocks touches */}
      <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
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

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.headerSide, styles.headerLeft]}>
          <Text style={styles.greeting} numberOfLines={1}>
            Hello, {name}
          </Text>
        </View>

        {/* both sides are flex: 1, so this sits in the exact middle whatever their widths */}
        <SimSelector sims={sims} activeSim={activeSim} onChange={onChangeSim} />

        <View style={[styles.headerSide, styles.headerRight]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={10}
            onPress={onPressNotifications}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* takes the space under the header and centres the highlight in it */}
      <View style={styles.body}>
        <Pressable
          accessibilityRole={onPressBalance ? 'button' : undefined}
          disabled={!onPressBalance}
          onPress={onPressBalance}
          style={styles.balanceHighlight}
        >
          <LinearGradient
            colors={[
              'rgba(220,210,255,0.30)',
              'rgba(164,201,255,0.22)',
              'rgba(192,174,255,0.24)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={styles.label}>Budget Balance</Text>
          <Text style={styles.balance}>
            {balance === null ? 'Add your budget' : formatKsh(balance)}
          </Text>

          <View style={styles.row}>
            <View style={styles.statBlock}>
              <View style={styles.statHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="arrow-down"
                    size={14}
                    color="#1FA64A"
                    style={{ transform: [{ rotate: '-320deg' }] }}
                  />
                </View>
                <Text style={styles.statLabel}>Received</Text>
              </View>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {formatKsh(received)}
              </Text>
            </View>

            <View style={styles.statBlock}>
              <View style={styles.statHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="arrow-up"
                    size={14}
                    color="#D6393F"
                    style={{ transform: [{ rotate: '40deg' }] }}
                  />
                </View>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
              <Text
                style={styles.statValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {formatKsh(spent)}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    // curves the card's own bottom corners; the page behind shows in the gaps
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#381FDE', // shows for a frame before the gradient paints
  },
  shine: {
    position: 'absolute',
    top: '-30%',
    left: -60,
    width: 60,
    height: '160%',
  },
  shineGradient: {
    flex: 1,
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10, 
    paddingVertical: 22,
  },
  headerSide: {
    flex: 1,
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // sim selector
  simSelector: {
    alignItems: 'center',
  },
  simToggle: {
    minWidth: 108,
    minHeight: 36,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 24,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0px 2px 4px rgba(0, 0, 0, 0.18), 0px 2px 5px rgba(0, 0, 0, 0.12)',
  },
  simToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  simChevron: {
    position: 'absolute',
    right: 9,
  },
  simMenu: {
    position: 'absolute',
    top: 44,
    left: '50%',
    marginLeft: -MENU_WIDTH / 2, // centres the dropdown under the pill
    width: MENU_WIDTH,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E0F5',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 6px 16px rgba(7, 2, 42, 0.16)',
  },
  simMenuOption: {
    height: 43,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simMenuOptionDisabled: {
    opacity: 0.45,
  },
  simMenuText: {
    color: '#1A1633',
    fontSize: 14,
    fontWeight: '600',
  },
  simMenuTextDisabled: {
    color: '#777386',
  },

  // highlight
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
  },
  balanceHighlight: {
    width: '92%',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    boxShadow: '0px 6px 24px rgba(167, 174, 255, 0.22)',
    alignItems: 'center',
  },
  label: {
    color: '#E4E0FB',
    fontSize: 14,
    textAlign: 'center',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: '#E4E0FB',
    fontSize: 16,
  },
  statValue: {
    width: '100%',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
});