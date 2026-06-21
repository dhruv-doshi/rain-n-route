'use client';

import { createContext, useContext } from 'react';

/**
 * Context providing the current google.maps.Map instance to child components.
 * Returns null while the map is loading or if initialization failed.
 */
export const MapInstanceContext = createContext<google.maps.Map | null>(null);

/**
 * Hook to access the current Google Maps map instance.
 * Returns null if the map is not yet ready or failed to load.
 */
export function useMapInstance(): google.maps.Map | null {
  return useContext(MapInstanceContext);
}
