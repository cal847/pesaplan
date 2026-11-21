import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import Svg, { G, Path } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

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

function createRoundedArcPath({
  centerX,
  centerY,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  cornerRadius = 3,
}: {
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  cornerRadius?: number;
}) {
  const sweepAngle = endAngle - startAngle;
  
  if (sweepAngle < 1) {
     return ''; 
  }

  const startOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const startInner = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const endInner = polarToCartesian(centerX, centerY, innerRadius, endAngle);

  const outerAngleOffset = cornerRadius / outerRadius * (180 / Math.PI);
  const innerAngleOffset = cornerRadius / innerRadius * (180 / Math.PI);

  const startOuterTrimmed = polarToCartesian(centerX, centerY, outerRadius, startAngle + outerAngleOffset);
  const endOuterTrimmed = polarToCartesian(centerX, centerY, outerRadius, endAngle - outerAngleOffset);
  
  const startInnerTrimmed = polarToCartesian(centerX, centerY, innerRadius, startAngle + innerAngleOffset);
  const endInnerTrimmed = polarToCartesian(centerX, centerY, innerRadius, endAngle - innerAngleOffset);

  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  const d = [
    'M', startOuterTrimmed.x, startOuterTrimmed.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, endOuterTrimmed.x, endOuterTrimmed.y,
    'Q', endOuter.x, endOuter.y, endInnerTrimmed.x, endInnerTrimmed.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, startInnerTrimmed.x, startInnerTrimmed.y,
    'Q', startInner.x, startInner.y, startOuterTrimmed.x, startOuterTrimmed.y,
    'Z'
  ].join(' ');

  return d;
}

function DonutSlice({
  slice,
  index,
  centerX,
  centerY,
  innerRadius,
  outerRadius,
  selectedIndex,
  onSelect,
  startAngle,
  endAngle,
}: {
  slice: Slice;
  index: number;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  startAngle: number;
  endAngle: number;
}) {
  const isSelected = selectedIndex === index;

  // We still use AnimatedG to allow for future animations if needed, 
  // but we remove the transform logic that caused the "pop".
  const animatedProps = useAnimatedProps(() => {
    return {
      transform: [{ translateX: 0 }, { translateY: 0 }],
    };
  });

  const pathData = createRoundedArcPath({
    centerX,
    centerY,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    cornerRadius: 3,
  });

  if (!pathData) return null;

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path
        d={pathData}
        fill={slice.color}
        stroke="none"
        opacity={isSelected ? 1 : 0.9} // Subtle visual feedback via opacity instead of movement
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
  thickness = 40,
}: Props) {
  // Filter out zero values to prevent math errors
  const validSlices = slices.filter((s) => s.value > 0);
  const total = validSlices.reduce((sum: number, slice: Slice) => sum + slice.value, 0);

  // Safe selection check
  const selected =
    selectedIndex !== null && validSlices[selectedIndex]
      ? validSlices[selectedIndex]
      : null;

  const percent = selected && total > 0 ? (selected.value / total) * 100 : 0;

  const centerX = size / 2;
  const centerY = size / 2;
  
  const outerRadius = (size / 2) - 10; 
  const innerRadius = outerRadius - thickness;

  if (total <= 0 || validSlices.length === 0) {
    return (
      <View style={[styles.wrap, { height: size }]}>
        <View style={styles.center}>
          <Text style={styles.centerName}>No data available</Text>
          <Text style={styles.centerAmount}>for this period</Text>
        </View>
      </View>
    );
  }

  let currentAngle = 0;
  // If only 1 slice, remove gap to make it a perfect circle
  const gap = validSlices.length === 1 ? 0 : 1;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {validSlices.map((slice: Slice, index: number) => {
          const sweep = (slice.value / total) * 360;
          
          const startAngle = currentAngle + gap / 2;
          const endAngle = currentAngle + sweep - gap / 2;

          currentAngle += sweep;

          return (
            <DonutSlice
              key={`${slice.label}-${index}`}
              slice={slice}
              index={index}
              centerX={centerX}
              centerY={centerY}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              selectedIndex={selectedIndex}
              onSelect={onSelect}
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