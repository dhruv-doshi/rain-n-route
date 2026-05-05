import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserPreferences } from '@/types';
import { idbStorage } from './persistAdapter';
import { runMigrations, CURRENT_VERSION } from './migrations';

export const DEFAULT_PREFERENCES: UserPreferences = {
  transportPriority: ['transit', 'two_wheeler', 'car', 'walk'],
  maxWalkMeters: 1000,
  weatherSensitivity: 'medium',
  preferredSort: 'fastest',
  defaultBufferMinutes: 10,
  unitSystem: 'metric',
  theme: 'system',
};

interface PreferencesState {
  preferences: UserPreferences;
  set: (patch: Partial<UserPreferences>) => void;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      set(patch) {
        set((s) => ({ preferences: { ...s.preferences, ...patch } }));
      },
      reset() {
        set({ preferences: DEFAULT_PREFERENCES });
      },
    }),
    {
      name: 'cw:preferences',
      storage: createJSONStorage(() => idbStorage),
      version: CURRENT_VERSION,
      migrate: runMigrations,
    },
  ),
);
