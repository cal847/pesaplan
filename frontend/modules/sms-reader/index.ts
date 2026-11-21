import { requireNativeModule } from 'expo';

export type RawSms = {
  id: number;
  address: string;
  body: string;
  date: number; // epoch ms
  simSlot: number; // 0 = SIM 1, 1 = SIM 2, -1 = unknown
  subscriptionId: number; // 1 = SIM 1, 2 = SIM 2, -1 = unknown
};

type Native = { 
  readInbox(afterDate: number, afterId: number, limit: number): Promise<RawSms[]> 
};

// Expo Go, iOS and older builds have no native module. The app still works there, with paste only.
const native: Native | null = (() => {
  try {
    return requireNativeModule<Native>('SmsReader');
  } catch (error) {
    console.error('[SmsInbox] Failed to load native module:', error);
    return null;
  }
})();

export const smsInboxAvailable = native !== null;

export function readInbox(
    afterDate: number = 0,
    afterId: number = 0,
    limit: number = 1000
): Promise<RawSms[]> {
  return native ? native.readInbox(afterDate, afterId, limit) : Promise.resolve([]);
}