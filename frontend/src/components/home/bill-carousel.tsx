import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
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

const CARD_WIDTH = 140;
const CARD_GAP = 6;
const ITEM_WIDTH = CARD_WIDTH + CARD_GAP;
const PADDING_LEFT = 4;

export function BillsCarousel({ bills }: Props) {
  const { width } = useWindowDimensions();
  const upcomingBills = bills.filter(
    (bill) => bill.days_remaining <= 30
  );

  const scrollX = useSharedValue(0);
  const viewportWidth = width - 32;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <Animated.FlatList<Bill>
      data={upcomingBills}
      horizontal
      showsHorizontalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      alwaysBounceHorizontal={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={styles.listContent}
      keyExtractor={(item) => item.bill_name}
      renderItem={({ item, index }) => (
        <CarouselCard
          item={item}
          index={index}
          scrollX={scrollX}
          totalItems={upcomingBills.length}
          viewportWidth={viewportWidth}
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
  viewportWidth,
}: {
  item: Bill;
  index: number;
  scrollX: SharedValue<number>;
  totalItems: number;
  viewportWidth: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (totalItems <= 2) {
      return {
        transform: [{ scale: 1 }],
      };
    }

    const focusedPosition =
      PADDING_LEFT + index * ITEM_WIDTH + CARD_WIDTH / 2;
    const distance = Math.abs(scrollX.value + viewportWidth / 2 - focusedPosition);
    const scale = interpolate(
      distance,
      [0, ITEM_WIDTH, ITEM_WIDTH * 2],
      [1, 0.95, 0.9],
      Extrapolation.CLAMP
    );

    return {
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
    height: 75,
    marginRight: CARD_GAP,
  },
});