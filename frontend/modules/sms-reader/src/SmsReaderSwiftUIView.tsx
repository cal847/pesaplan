import { requireNativeView } from 'expo';
import { type CommonViewModifierProps } from '@expo/ui/swift-ui';
import { createViewModifierEventListener } from '@expo/ui/swift-ui/modifiers';
import * as React from 'react';

export interface SmsReaderSwiftUIViewProps extends CommonViewModifierProps {
  title: string;
  children?: React.ReactNode;
}

const NativeSmsReaderSwiftUIView = requireNativeView<SmsReaderSwiftUIViewProps>(
  'SmsReader',
  'SmsReaderSwiftUIView'
);

export default function SmsReaderSwiftUIView({
  modifiers,
  ...rest
}: SmsReaderSwiftUIViewProps) {
  return (
    <NativeSmsReaderSwiftUIView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
    />
  );
}
