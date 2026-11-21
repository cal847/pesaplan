import { requireNativeView } from 'expo';
import { type PrimitiveBaseProps } from '@expo/ui/jetpack-compose';
import { createViewModifierEventListener } from '@expo/ui/jetpack-compose/modifiers';
import * as React from 'react';

export interface SmsReaderComposeViewProps extends PrimitiveBaseProps {
  title: string;
  children?: React.ReactNode;
}

const NativeSmsReaderComposeView = requireNativeView<SmsReaderComposeViewProps>(
  'SmsReader',
  'SmsReaderComposeView'
);

export default function SmsReaderComposeView({
  modifiers,
  ...rest
}: SmsReaderComposeViewProps) {
  return (
    <NativeSmsReaderComposeView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
    />
  );
}
