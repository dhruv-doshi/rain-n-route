import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RecurringCommute } from '@/types';
import { idbStorage } from './persistAdapter';
import { runMigrations, CURRENT_VERSION } from './migrations';

interface RecurringState {
  commutes: RecurringCommute[];
  add: (commute: RecurringCommute) => void;
  update: (id: string, patch: Partial<Omit<RecurringCommute, 'id' | 'createdAt'>>) => void;
  remove: (id: string) => void;
  setActive: (id: string, active: boolean) => void;
}

export const useRecurringStore = create<RecurringState>()(
  persist(
    (set) => ({
      commutes: [],
      add(commute) {
        set((s) => {
          if (s.commutes.some((c) => c.id === commute.id)) return s;
          return { commutes: [...s.commutes, commute] };
        });
      },
      update(id, patch) {
        set((s) => ({
          commutes: s.commutes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },
      remove(id) {
        set((s) => ({ commutes: s.commutes.filter((c) => c.id !== id) }));
      },
      setActive(id, active) {
        set((s) => ({
          commutes: s.commutes.map((c) => (c.id === id ? { ...c, active } : c)),
        }));
      },
    }),
    {
      name: 'cw:recurring',
      storage: createJSONStorage(() => idbStorage),
      version: CURRENT_VERSION,
      migrate: runMigrations,
    },
  ),
);
