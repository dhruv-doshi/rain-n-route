import { describe, it, expect, vi, afterEach } from 'vitest';
import * as geo from '@/lib/geo';
import { corridorIdsNearRoute } from '@/lib/hotspotMemory';

describe('hotspotMemory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds corridors near sampled route waypoints', () => {
    vi.spyOn(geo, 'sampleWaypoints').mockReturnValue([{ lat: 12.9176, lng: 77.6233 }]);
    const ids = corridorIdsNearRoute('test-polyline', 1000);
    expect(ids).toContain('hs-silk-board');
  });

  it('returns empty for routes far from hotspots', () => {
    vi.spyOn(geo, 'sampleWaypoints').mockReturnValue([{ lat: 15, lng: 74 }]);
    expect(corridorIdsNearRoute('test-polyline')).toEqual([]);
  });
});
