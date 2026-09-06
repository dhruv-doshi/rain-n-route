import { EXPLORE_TOPICS, getBengaluruData, type ExploreTopicId } from '@/lib/bengaluruData';

const TOPIC_IDS = new Set(EXPLORE_TOPICS.map((topic) => topic.id));

export interface ExploreSearchHit {
  id: string;
  name: string;
  detail: string;
  source: string;
  lat: number;
  lng: number;
  category: string;
  suggestedTopic: ExploreTopicId;
}

function ringCentroid(ring: number[][]): { lat: number; lng: number } {
  if (ring.length === 0) return { lat: 12.9716, lng: 77.5946 };
  let latSum = 0;
  let lngSum = 0;
  for (const [lng, lat] of ring) {
    latSum += lat;
    lngSum += lng;
  }
  return { lat: latSum / ring.length, lng: lngSum / ring.length };
}

function lineCentroid(line: number[][]): { lat: number; lng: number } {
  return ringCentroid(line);
}

/** Search bundled Bengaluru explore features by name or detail text. */
export function searchExploreFeatures(query: string, limit = 15): ExploreSearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const data = getBengaluruData();
  const hits: ExploreSearchHit[] = [];

  const maybeAdd = (hit: ExploreSearchHit) => {
    const haystack = `${hit.name} ${hit.detail} ${hit.category}`.toLowerCase();
    if (haystack.includes(q)) hits.push(hit);
  };

  for (const p of data.floodPoints) {
    maybeAdd({
      id: p.id,
      name: p.name,
      detail: 'BBMP flood-prone location',
      source: p.source,
      lat: p.lat,
      lng: p.lng,
      category: 'Flood-prone',
      suggestedTopic: 'flood_points',
    });
  }

  for (const p of data.lowLying) {
    maybeAdd({
      id: p.id,
      name: p.name,
      detail: 'Low-lying area vulnerable to waterlogging',
      source: p.source,
      lat: p.lat,
      lng: p.lng,
      category: 'Low-lying',
      suggestedTopic: 'low_lying',
    });
  }

  for (const h of data.hotspots) {
    maybeAdd({
      id: h.id,
      name: h.name,
      detail: h.reason,
      source: h.source,
      lat: h.lat,
      lng: h.lng,
      category: 'Traffic hotspot',
      suggestedTopic: 'traffic',
    });
  }

  for (const stop of data.transitStops) {
    maybeAdd({
      id: stop.id,
      name: stop.name,
      detail: stop.mode === 'metro' ? `Metro · ${stop.line ?? 'Namma Metro'}` : 'BMTC hub',
      source: stop.source,
      lat: stop.lat,
      lng: stop.lng,
      category: stop.mode === 'metro' ? 'Metro' : 'BMTC',
      suggestedTopic: 'transit',
    });
  }

  for (const lake of data.lakes) {
    const ring = lake.polygon?.[0];
    if (!ring) continue;
    const { lat, lng } = ringCentroid(ring);
    maybeAdd({
      id: lake.id,
      name: lake.name,
      detail: 'Existing tank / lake',
      source: lake.source,
      lat,
      lng,
      category: 'Lake',
      suggestedTopic: 'lakes',
    });
  }

  for (const drain of data.drains) {
    const line = drain.lines[0];
    if (!line) continue;
    const { lat, lng } = lineCentroid(line);
    maybeAdd({
      id: drain.id,
      name: drain.name,
      detail: drain.valley ? `Rajakaluve in ${drain.valley}` : 'Primary rajakaluve',
      source: drain.source,
      lat,
      lng,
      category: 'Drain',
      suggestedTopic: 'drains',
    });
  }

  for (const valley of data.valleys) {
    const ring = valley.polygon[0];
    if (!ring) continue;
    const { lat, lng } = ringCentroid(ring);
    maybeAdd({
      id: valley.id,
      name: valley.name,
      detail: 'Valley watershed system',
      source: valley.source,
      lat,
      lng,
      category: 'Valley',
      suggestedTopic: 'valleys',
    });
  }

  for (const story of data.stories) {
    maybeAdd({
      id: story.id,
      name: story.name,
      detail: story.text.slice(0, 100),
      source: story.source,
      lat: story.lat,
      lng: story.lng,
      category: 'Place story',
      suggestedTopic: 'stories',
    });
  }

  return hits.slice(0, limit);
}

export function isExploreTopicId(value: string): value is ExploreTopicId {
  return TOPIC_IDS.has(value as ExploreTopicId);
}

export function parseExploreTopicId(value: string | undefined): ExploreTopicId | null {
  if (!value) return null;
  return isExploreTopicId(value) ? value : null;
}
