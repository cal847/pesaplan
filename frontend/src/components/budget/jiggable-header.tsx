import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
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
      <Animated.Text style={[styles.title, animatedStyle]}>
        {title}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { 
    fontWeight: '700', 
    fontSize: 15, 
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingRight: 8,
  },
});