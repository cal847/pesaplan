import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { FONT_FAMILIES } from '@/components/app-text';

import { useJiggle } from './jiggle-card';

type Props = {
  title: string;
  editMode: boolean;
  index: number;
  onPress: () => void;
};

export function JiggableHeader({ title, editMode, index, onPress }: Props) {
  const animatedStyle = useJiggle(editMode, index);

  return (
    <Pressable onPress={onPress} disabled={!editMode}>
      <Animated.Text
        style={[{ fontFamily: FONT_FAMILIES.headingItalic }, styles.title, animatedStyle]}
      >
        {title}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { 
    fontSize: 15, 
    paddingVertical: 4,
    paddingRight: 8,
  },
});