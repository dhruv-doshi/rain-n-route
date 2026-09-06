import { sampleWaypoints, haversineMeters } from '@/lib/geo';
import { getBengaluruData } from '@/lib/bengaluruData';

const DB_NAME = 'rnr-hotspot-memory';
const DB_VERSION = 1;
const STORE = 'corridor_delays';

export interface CorridorDelayRecord {
  /** Hotspot id from bundled data */
  corridorId: string;
  /** 0 = Sun 00:00 … 167 = Sat 23:00 */
  hourOfWeek: number;
  totalDelaySec: number;
  sampleCount: number;
  lastUpdatedAt: string;
}

function hourOfWeek(date = new Date()): number {
  const day = date.getDay();
  const hour = date.getHours();
  return day * 24 + hour;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: ['corridorId', 'hourOfWeek'] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function corridorIdsNearRoute(geometry: string, radiusM = 800): string[] {
  const waypoints = sampleWaypoints(geometry, 2000);
  const { hotspots } = getBengaluruData();
  const hits = new Set<string>();
  for (const hs of hotspots) {
    for (const wp of waypoints) {
      if (haversineMeters(wp, { lat: hs.lat, lng: hs.lng }) <= radiusM) {
        hits.add(hs.id);
        break;
      }
    }
  }
  return [...hits];
}

/** Persist delay observation for corridors this route passes near. */
export async function recordCorridorDelay(geometry: string, delaySec: number): Promise<void> {
  if (delaySec <= 0 || !geometry) return;
  const ids = corridorIdsNearRoute(geometry);
  if (ids.length === 0) return;

  const hour = hourOfWeek();
  const now = new Date().toISOString();

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const corridorId of ids) {
        const getReq = store.get([corridorId, hour]);
        getReq.onsuccess = () => {
          const prev = getReq.result as CorridorDelayRecord | undefined;
          const next: CorridorDelayRecord = {
            corridorId,
            hourOfWeek: hour,
            totalDelaySec: (prev?.totalDelaySec ?? 0) + delaySec,
            sampleCount: (prev?.sampleCount ?? 0) + 1,
            lastUpdatedAt: now,
          };
          store.put(next);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // best-effort — memory must not break the UI
  }
}

export async function getCorridorDelayStats(
  corridorId: string,
  hour = hourOfWeek(),
): Promise<{ avgDelaySec: number; sampleCount: number } | null> {
  try {
    const db = await openDb();
    const record = await new Promise<CorridorDelayRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get([corridorId, hour]);
      req.onsuccess = () => resolve(req.result as CorridorDelayRecord | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record || record.sampleCount === 0) return null;
    return {
      avgDelaySec: Math.round(record.totalDelaySec / record.sampleCount),
      sampleCount: record.sampleCount,
    };
  } catch {
    return null;
  }
}

/** Typical delay hint for a hotspot at current hour — seeded copy if no local data. */
export async function getHotspotDelayHint(
  corridorId: string,
  peakHours?: string,
): Promise<string | null> {
  const stats = await getCorridorDelayStats(corridorId);
  if (stats && stats.sampleCount >= 2) {
    const mins = Math.round(stats.avgDelaySec / 60);
    return `Your history: ~+${mins} min at this hour (${stats.sampleCount} trips)`;
  }
  if (peakHours) return `Usually slow ${peakHours}`;
  return null;
}

export { hourOfWeek, corridorIdsNearRoute };
