// frontend/src/components/home/bills-carousel.tsx

import { Ionicons } from '@expo/vector-icons';
import { Dimensions, FlatList, StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { BillCard } from '@/components/home/bill-card';

type Bill = {
  bill_name: string;
  amount: number;
  days_remaining: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  backgroundColor: string;
};

type Props = {
  bills: Bill[];
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = 170;
const CARD_MARGIN = 10;
const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;
const PADDING_LEFT = 20;

const CENTER_OFFSET = (SCREEN_WIDTH - CARD_WIDTH) / 2;

function getSnapOffsets(numberOfCards: number) {
  return Array.from({ length: numberOfCards }, (_, index) => {
    if (index === 0) {
      return 0;
    }

    return index * ITEM_WIDTH - CENTER_OFFSET + PADDING_LEFT;
  });
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export function BillsCarousel({ bills }: Props) {
  const upcomingBills = bills.filter(
    (bill) => bill.days_remaining <= 30
  );

  const scrollX = useSharedValue(0);

  const snapOffsets = getSnapOffsets(upcomingBills.length);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <AnimatedFlatList
      data={upcomingBills}
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToOffsets={snapOffsets}
      bounces={false}
      overScrollMode="never"
      alwaysBounceHorizontal={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={styles.listContent}
      keyExtractor={(item: Bill) => item.bill_name}
      renderItem={({
        item,
        index,
      }: {
        item: Bill;
        index: number;
      }) => (
        <CarouselCard
          item={item}
          index={index}
          scrollX={scrollX}
          totalItems={upcomingBills.length}
        />
      )}
    />
  );
}

function CarouselCard({
  item,
  index,
  scrollX,
  totalItems,
}: {
  item: Bill;
  index: number;
  scrollX: Animated.SharedValue<number>;
  totalItems: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (totalItems <= 2) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }],
      };
    }

    const cardPosition = PADDING_LEFT + index * ITEM_WIDTH;
    const focusedPosition =
      index === 0
        ? 0
        : index * ITEM_WIDTH - CENTER_OFFSET + PADDING_LEFT;
    const distance = Math.abs(scrollX.value - focusedPosition);
    const opacity = interpolate(
      distance,
      [0, ITEM_WIDTH, ITEM_WIDTH * 2],
      [1, 0.25, 0.25],
      Extrapolation.CLAMP
    );

    /*
     * Slightly shrink cards that aren't focused.
     */
    const scale = interpolate(
      distance,
      [0, ITEM_WIDTH, ITEM_WIDTH * 2],
      [1, 0.95, 0.9],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <BillCard
        name={item.bill_name}
        amount={item.amount}
        daysLeft={item.days_remaining}
        icon={item.icon}
        iconColor={item.iconColor}
        backgroundColor={item.backgroundColor}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingLeft: PADDING_LEFT,
    paddingRight: PADDING_LEFT,
  },

  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_MARGIN,
  },
});