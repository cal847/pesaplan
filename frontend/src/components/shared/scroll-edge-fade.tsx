// frontend/src/components/shared/scroll-edge-fade.tsx
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  height?: number;
  contentContainerStyle?: ViewStyle;
  onScroll?: (scrollY: number) => void;
};

export function ScrollEdgeFade({
  children,
  height = 190,
  contentContainerStyle,
  onScroll,
}: Props) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    onScroll?.(event.contentOffset.y);
  });

  return (
    <View style={[styles.container, { height }]}>
      <Animated.ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
});