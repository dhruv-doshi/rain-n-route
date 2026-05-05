import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CommuteLogEntry, TransportMode } from '@/types';
import { idbStorage } from './persistAdapter';
import { runMigrations, CURRENT_VERSION } from './migrations';

const MAX_ENTRIES = 500;

interface HistoryState {
  entries: CommuteLogEntry[];
  append: (entry: CommuteLogEntry) => void;
  updateActuals: (id: string, actual: { duration?: number; cost?: number }) => void;
  remove: (id: string) => void;
  clear: () => void;
  // Selectors
  byMode: (mode: TransportMode) => CommuteLogEntry[];
  recent: (n: number) => CommuteLogEntry[];
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      append(entry) {
        set((s) => {
          const next = [entry, ...s.entries].slice(0, MAX_ENTRIES);
          return { entries: next };
        });
      },
      updateActuals(id, actual) {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...(actual.duration !== undefined ? { actualDuration: actual.duration } : {}),
                  ...(actual.cost !== undefined ? { actualCost: actual.cost } : {}),
                }
              : e,
          ),
        }));
      },
      remove(id) {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },
      clear() {
        set({ entries: [] });
      },
      byMode(mode) {
        return get().entries.filter((e) => e.mode === mode);
      },
      recent(n) {
        return get().entries.slice(0, n);
      },
    }),
    {
      name: 'cw:history',
      storage: createJSONStorage(() => idbStorage),
      version: CURRENT_VERSION,
      migrate: runMigrations,
    },
  ),
);
