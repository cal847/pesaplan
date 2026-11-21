import { registerWebModule, NativeModule } from 'expo';

import { SmsReaderModuleEvents } from './SmsReader.types';

class SmsReaderModule extends NativeModule<SmsReaderModuleEvents> {
  PI = Math.PI;

  hello() {
    return 'Hello world! 👋';
  }

  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
}

export default registerWebModule(SmsReaderModule, 'SmsReaderModule');
