// frontend/src/lib/sms/inbox.ts
import { parseMpesaSms } from './parse-mpesa';
import type { ParsedTransaction } from './types';

export type RawSms = {
  id: number;
  address: string;
  body: string;
  date: number;
  subscriptionId: number;
  simSlot: number;
};

export type Candidate = { parsed: ParsedTransaction; simKey: string };

export const MPESA_SENDERS = "MPESA";

/** Generate a simKey based on the slot.
 * Returns sim_1, sim_2 or unkown
 */
export const simKeyFor = (simSlot: number): string => {
  return simSlot >= 0 ? `sim_${simSlot + 1}` : 'unknown';
};

export const defaultSimLabel = (simSlot: number | null) =>
    (simSlot !== null && simSlot >= 0 ? `SIM ${simSlot + 1}` : 'SIM');

export function toCandidates(rows: RawSms[]) {
  const candidates: Candidate[] = [];
  const sims = new Map<string, number | null>(); // sim key -> slot
  let unreadable = 0;
  let newest = 0;

  for (const row of rows) {
    newest = Math.max(newest, row.date); // moves on even past messages we can't read
    const result = parseMpesaSms(row.body);
    if (!result.ok) {
      if (result.reason !== 'missing_code') unreadable++; // no code means it isn't an M-Pesa confirmation
      continue;
    }
    const simKey = simKeyFor(row.subscriptionId);
    candidates.push({ parsed: result.transaction, simKey });
    if (simKey) sims.set(simKey, row.simSlot >= 0 ? row.simSlot : null);
  }
  return { candidates, sims, unreadable, newest };
}