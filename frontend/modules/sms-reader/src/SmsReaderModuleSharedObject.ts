import { SharedObject, useReleasingSharedObject } from 'expo';

import SmsReaderModule from './SmsReaderModule';

export declare class SmsReaderModuleSharedObject extends SharedObject {
  count: number;
}

/**
 * Creates a new SmsReaderModuleSharedObject instance.
 * You are responsible for releasing it from memory by calling `release()` when done.
 */
export function createSmsReaderModuleSharedObject(): SmsReaderModuleSharedObject {
  return new SmsReaderModule.SmsReaderModuleSharedObject();
}

/**
 * A hook that creates a SmsReaderModuleSharedObject instance and automatically
 * releases it when the component unmounts.
 */
export function useSmsReaderModuleSharedObject(): SmsReaderModuleSharedObject {
  return useReleasingSharedObject(() => new SmsReaderModule.SmsReaderModuleSharedObject(), []);
}
