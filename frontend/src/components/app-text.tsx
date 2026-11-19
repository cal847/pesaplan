import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

export const APP_FONT_ASSETS = {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

export const FONT_FAMILIES = {
  heading: 'PlusJakartaSans_1000',
  headingItalic: 'DMSerifDisplay_400Regular_Italic',
  body: {
    '400': 'PlusJakartaSans_400Regular',
    '500': 'PlusJakartaSans_500Medium',
    '600': 'PlusJakartaSans_600SemiBold',
    '700': 'PlusJakartaSans_700Bold',
    '800': 'PlusJakartaSans_800ExtraBold',
  },
} as const;

type AppTextVariant = 'body' | 'heading';

function getFontFamily(variant: AppTextVariant, style: StyleProp<TextStyle>) {
  if (variant === 'heading') {
    return StyleSheet.flatten(style)?.fontStyle === 'italic'
      ? FONT_FAMILIES.headingItalic
      : FONT_FAMILIES.heading;
  }

  const BODY_FONTS: Record<string, string> = FONT_FAMILIES.body;
  const weight = StyleSheet.flatten(style)?.fontWeight;
  const normalizedWeight = weight === 'bold' ? '700' : String(weight ?? '400');

  return BODY_FONTS[normalizedWeight] ?? FONT_FAMILIES.body['400'];
}

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
};

export function AppText({ style, variant = 'body', ...props }: AppTextProps) {
  return (
    <NativeText
      {...props}
      style={[{ fontFamily: getFontFamily(variant, style) }, style]}
    />
  );
}

export function AppTextInput({ style, ...props }: TextInputProps) {
  return (
    <NativeTextInput
      {...props}
      style={[{ fontFamily: getFontFamily('body', style) }, style]}
    />
  );
}

export { AppText as Text, AppTextInput as TextInput };

