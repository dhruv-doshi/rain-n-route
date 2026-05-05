import { createContext, useContext } from 'react';
import type { Map } from 'maplibre-gl';

export const MapInstanceContext = createContext<Map | null>(null);

export function useMapInstance(): Map | null {
  return useContext(MapInstanceContext);
}
