import * as React from 'react';

import { SmsReaderViewProps } from './SmsReader.types';

export default function SmsReaderView(props: SmsReaderViewProps) {
  return (
    <div
      style={{
        backgroundColor: '#aabbcc',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => props.onTap({ nativeEvent: {} })}>
      <span>SmsReader - native view</span>
      <span>Tap the view to emit a view event</span>
    </div>
  );
}
