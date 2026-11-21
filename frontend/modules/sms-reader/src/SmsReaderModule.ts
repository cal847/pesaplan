import { NativeModule, requireNativeModule } from 'expo';

import { SmsReaderModuleEvents } from './SmsReader.types';
import type { SmsReaderModuleSharedObject } from './SmsReaderModuleSharedObject';

declare class SmsReaderModule extends NativeModule<SmsReaderModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  SmsReaderModuleSharedObject: typeof SmsReaderModuleSharedObject;
}

export default requireNativeModule<SmsReaderModule>('SmsReader');
