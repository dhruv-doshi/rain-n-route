import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SavedLocation } from '@/types';
import { idbStorage } from './persistAdapter';
import { runMigrations, CURRENT_VERSION } from './migrations';

const MAX_LOCATIONS = 15;

interface LocationsState {
  locations: SavedLocation[];
  add: (location: SavedLocation) => void;
  update: (id: string, patch: Partial<Omit<SavedLocation, 'id' | 'createdAt'>>) => void;
  remove: (id: string) => void;
  touch: (id: string, lastUsedAt: string) => void;
  clear: () => void;
}

export const useLocationsStore = create<LocationsState>()(
  persist(
    (set) => ({
      locations: [],
      add(location) {
        set((s) => {
          if (s.locations.some((l) => l.id === location.id)) return s;
          const next = [location, ...s.locations].slice(0, MAX_LOCATIONS);
          return { locations: next };
        });
      },
      update(id, patch) {
        set((s) => ({
          locations: s.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }));
      },
      remove(id) {
        set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }));
      },
      touch(id, lastUsedAt) {
        set((s) => ({
          locations: s.locations.map((l) => (l.id === id ? { ...l, lastUsedAt } : l)),
        }));
      },
      clear() {
        set({ locations: [] });
      },
    }),
    {
      name: 'cw:locations',
      storage: createJSONStorage(() => idbStorage),
      version: CURRENT_VERSION,
      migrate: runMigrations,
    },
  ),
);
