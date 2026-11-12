import { create } from 'zustand';

/** Screens reload when this changes, for example after an import. */
export const useDataStore = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));