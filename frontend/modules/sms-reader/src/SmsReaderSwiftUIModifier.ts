import { createModifier, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

export const smsReaderSwiftUIModifier = (params: {
  color?: string;
  width?: number;
  cornerRadius?: number;
}): ModifierConfig => createModifier('smsReaderSwiftUIModifier', params);
