import { ReactNode, useEffect, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { usePalette } from '@/hooks/use-theme';
import { Text } from '@/components/app-text';

export const ROW_GUTTER = 30;

const MAX_BODY_HEIGHT = 500;

export function DisclosureRow({
  label,
  icon,
  iconColor,
  children,
  labelStyle,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: ReactNode;
  labelStyle?: StyleProp<TextStyle>;
}) {
  const p = usePalette();

  const [open, setOpen] = useState(false);
  const [shouldRenderBody, setShouldRenderBody] = useState(false);

  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(open ? 90 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [open, rotation]);

  function toggle() {
    const next = !open;

    setOpen(next);

    if (next) {
      setShouldRenderBody(true);

      progress.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = withTiming(0, {
        duration: 240,
        easing: Easing.in(Easing.cubic),
      });
    }
  }

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxHeight: progress.value * MAX_BODY_HEIGHT,
    transform: [
      {
        translateY: (1 - progress.value) * -6,
      },
    ],
  }));

  return (
    <View>
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.gutter}>
          {icon && (
            <Ionicons name={icon} size={18} color={iconColor ?? p.accent} style={styles.icon} />
          )}
        </View>

        <Text style={[styles.label, { color: p.text }, labelStyle]}>{label}</Text>
      </Pressable>

      {shouldRenderBody && (
        <Animated.View style={[styles.bodyWrapper, bodyStyle]}>
          <View style={styles.body}>{children}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  gutter: {
    width: ROW_GUTTER,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  bodyWrapper: {
    overflow: 'hidden',
  },
  body: {
    paddingLeft: 16 + ROW_GUTTER,
    paddingRight: 16,
    paddingBottom: 14,
    gap: 8,
  },
});