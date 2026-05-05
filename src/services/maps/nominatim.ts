import { ServiceError, assertOk, fetchWithRetry } from '@/lib/http';
import type { GeoResult, LatLng } from '@/types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
}

function classifyPlaceType(item: NominatimItem): GeoResult['placeType'] {
  if (item.class === 'amenity' || item.class === 'shop' || item.class === 'tourism') return 'poi';
  if (item.class === 'railway' || item.class === 'public_transport') return 'station';
  if (item.type === 'city' || item.type === 'suburb' || item.type === 'neighbourhood')
    return 'locality';
  return 'address';
}

export async function nominatimGeocode(query: string): Promise<GeoResult[]> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '0');

  const res = await fetchWithRetry(url.toString(), {
    headers: { 'User-Agent': 'rain-n-route-portfolio/0.1 (https://github.com/dhruv-doshi)' },
  });
  await assertOk(res);
  const data = (await res.json()) as NominatimItem[];

  return data.map((item) => ({
    id: String(item.place_id),
    label: item.display_name,
    coords: { lat: Number(item.lat), lng: Number(item.lon) },
    placeType: classifyPlaceType(item),
  }));
}

export async function nominatimReverseGeocode(coords: LatLng): Promise<GeoResult> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', String(coords.lat));
  url.searchParams.set('lon', String(coords.lng));
  url.searchParams.set('format', 'json');

  const res = await fetchWithRetry(url.toString(), {
    headers: { 'User-Agent': 'rain-n-route-portfolio/0.1 (https://github.com/dhruv-doshi)' },
  });
  await assertOk(res);
  const item = (await res.json()) as NominatimItem | { error: string };

  if ('error' in item || !('lat' in item)) {
    throw new ServiceError('NOT_FOUND', 'No reverse-geocode result', false);
  }

  return {
    id: String(item.place_id),
    label: item.display_name,
    coords: { lat: Number(item.lat), lng: Number(item.lon) },
    placeType: classifyPlaceType(item),
  };
}
