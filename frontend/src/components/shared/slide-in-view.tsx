import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function SlideInView({
  children,
  delay = 0,
  distance = 40,
  duration = 400,
  style,
}: Props) {
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      progress.value = 0;

      progress.value = withTiming(
        1,
        {
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
        }
      );
    }, [delay, duration])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: (1 - progress.value) * distance,
      },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}