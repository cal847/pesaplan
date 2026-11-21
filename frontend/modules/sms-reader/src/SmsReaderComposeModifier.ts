import { createModifier, type ModifierConfig } from '@expo/ui/jetpack-compose/modifiers';

export const smsReaderComposeModifier = (params: {
  color?: number;
  width?: number;
  cornerRadius?: number;
}): ModifierConfig => createModifier('smsReaderComposeModifier', params);
