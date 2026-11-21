import { requireNativeView } from 'expo';
import * as React from 'react';

import { SmsReaderViewProps } from './SmsReader.types';

const NativeView: React.ComponentType<SmsReaderViewProps> = requireNativeView('SmsReader');

export default function SmsReaderView(props: SmsReaderViewProps) {
  return <NativeView {...props} />;
}
