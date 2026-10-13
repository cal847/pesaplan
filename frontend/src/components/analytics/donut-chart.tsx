import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

export type Slice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  slices: Slice[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  formatAmount: (n: number) => string;
  size?: number;
  thickness?: number;
};

const AnimatedG = Animated.createAnimatedComponent(G);

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createArcPath({
  centerX,
  centerY,
  radius,
  startAngle,
  endAngle,
}: {
  centerX: number;
  centerY: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

function DonutSlice({
  slice,
  index,
  centerX,
  centerY,
  radius,
  thickness,
  selectedIndex,
  onSelect,
  popOffset,
  startAngle,
  endAngle,
}: {
  slice: Slice;
  index: number;
  centerX: number;
  centerY: number;
  radius: number;
  thickness: number;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  popOffset: SharedValue<number>;
  startAngle: number;
  endAngle: number;
}) {
  const isSelected = selectedIndex === index;
  const midAngle = (startAngle + endAngle) / 2;
  const midAngleRadians = ((midAngle - 90) * Math.PI) / 180;

  const animatedProps = useAnimatedProps(() => {
    const offsetX = isSelected ? Math.cos(midAngleRadians) * popOffset.value : 0;
    const offsetY = isSelected ? Math.sin(midAngleRadians) * popOffset.value : 0;

    return {
      transform: [{ translateX: offsetX }, { translateY: offsetY }],
    };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path
        d={createArcPath({
          centerX,
          centerY,
          radius,
          startAngle,
          endAngle,
        })}
        stroke={slice.color}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
        onPress={() => {
          onSelect(isSelected ? null : index);
        }}
      />
    </AnimatedG>
  );
}

export function DonutChart({
  slices,
  selectedIndex,
  onSelect,
  formatAmount,
  size = 220,
  thickness = 38,
}: Props) {
  const total = slices.reduce((sum: number, slice: Slice) => sum + slice.value, 0);
  const selected =
    selectedIndex !== null && slices[selectedIndex] ? slices[selectedIndex] : null;

  const percent = selected && total > 0 ? (selected.value / total) * 100 : 0;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - thickness) / 2;
  const popOffset = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(popOffset);
    popOffset.value = withTiming(selectedIndex === null ? 0 : 8, {
      duration: 220,
    });
  }, [selectedIndex, popOffset]);

  if (total <= 0) {
    return null;
  }

  let currentAngle = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {slices.map((slice: Slice, index: number) => {
          const sweep = (slice.value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sweep;
          currentAngle = endAngle;

          return (
            <DonutSlice
              key={`${slice.label}-${index}`}
              slice={slice}
              index={index}
              centerX={centerX}
              centerY={centerY}
              radius={radius}
              thickness={thickness}
              selectedIndex={selectedIndex}
              onSelect={onSelect}
              popOffset={popOffset}
              startAngle={startAngle}
              endAngle={endAngle}
            />
          );
        })}
      </Svg>

      <View pointerEvents="none" style={styles.center}>
        {selected ? (
          <>
            <Text style={styles.centerName} numberOfLines={1}>
              {selected.label}
            </Text>
            <Text style={styles.centerPercent}>{percent.toFixed(1)}%</Text>
            <Text style={styles.centerAmount}>{formatAmount(selected.value)}</Text>
          </>
        ) : (
          <>
            <Text style={styles.centerName}>Total</Text>
            <Text style={styles.centerAmount}>{formatAmount(total)}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 110,
  },
  centerName: {
    fontSize: 11,
    color: '#888',
  },
  centerPercent: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginVertical: 1,
  },
  centerAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
});