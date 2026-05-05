import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PlannedTrip } from '@/types';

interface TripState {
  current: PlannedTrip | null;
  set: (trip: PlannedTrip) => void;
  selectRoute: (routeId: string) => void;
  clear: () => void;
}

// Ephemeral: sessionStorage so it clears on tab close but survives page refreshes
const sessionStorageAdapter = {
  getItem: (name: string) => sessionStorage.getItem(name),
  setItem: (name: string, value: string) => sessionStorage.setItem(name, value),
  removeItem: (name: string) => sessionStorage.removeItem(name),
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      current: null,
      set(trip) {
        set({ current: trip });
      },
      selectRoute(routeId) {
        set((s) => (s.current ? { current: { ...s.current, selectedRouteId: routeId } } : s));
      },
      clear() {
        set({ current: null });
      },
    }),
    {
      name: 'cw:trip',
      storage: createJSONStorage(() => sessionStorageAdapter),
    },
  ),
);
