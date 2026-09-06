import type {
  BengaluruDataPack,
  HazardLine,
  HazardPoint,
  HazardPolygon,
  PlaceStory,
  TrafficHotspot,
  TransitStop,
} from '@/types';

import floodPointsRaw from '@/data/bengaluru/flood-points.json';
import lowLyingRaw from '@/data/bengaluru/low-lying.json';
import valleysRaw from '@/data/bengaluru/valleys.json';
import drainsRaw from '@/data/bengaluru/drains-primary.json';
import lakesRaw from '@/data/bengaluru/lakes.json';
import hotspotsRaw from '@/data/bengaluru/hotspots.json';
import storiesRaw from '@/data/bengaluru/stories.json';
import transitStopsRaw from '@/data/bengaluru/transit-stops.json';

let cached: BengaluruDataPack | null = null;

export function getBengaluruData(): BengaluruDataPack {
  if (cached) return cached;
  cached = {
    floodPoints: floodPointsRaw as HazardPoint[],
    lowLying: lowLyingRaw as HazardPoint[],
    valleys: valleysRaw as HazardPolygon[],
    drains: drainsRaw as HazardLine[],
    lakes: lakesRaw as HazardPolygon[],
    hotspots: hotspotsRaw as TrafficHotspot[],
    stories: storiesRaw as PlaceStory[],
    transitStops: transitStopsRaw as TransitStop[],
  };
  return cached;
}

export type ExploreLayerId =
  | 'flood'
  | 'low_lying'
  | 'valleys'
  | 'drains'
  | 'lakes'
  | 'hotspots'
  | 'stories'
  | 'transit';

export type ExploreTopicId =
  | 'flood_risk'
  | 'flood_points'
  | 'low_lying'
  | 'monsoon'
  | 'water_systems'
  | 'valleys'
  | 'drains'
  | 'lakes'
  | 'traffic'
  | 'transit'
  | 'commute'
  | 'monsoon_commute'
  | 'stories';

export type ExploreNearbyKind = 'flood' | 'hotspot' | 'transit' | 'commute' | 'none';

export const DEFAULT_EXPLORE_TOPIC: ExploreTopicId = 'flood_risk';

export const EXPLORE_TOPICS: {
  id: ExploreTopicId;
  label: string;
  summary: string;
  layers: ExploreLayerId[];
  nearbyKind: ExploreNearbyKind;
  group: 'water' | 'traffic' | 'culture';
}[] = [
  {
    id: 'flood_risk',
    label: 'Flood & waterlogging',
    summary:
      'BBMP flood-prone points and low-lying pockets where water collects during intense rain.',
    layers: ['flood', 'low_lying'],
    nearbyKind: 'flood',
    group: 'water',
  },
  {
    id: 'flood_points',
    label: 'Flood-prone points',
    summary:
      'BBMP / KSRSAC flood-prone locations from OpenCity — where waterlogging is documented.',
    layers: ['flood'],
    nearbyKind: 'flood',
    group: 'water',
  },
  {
    id: 'low_lying',
    label: 'Low-lying areas',
    summary:
      'Valley-floor pockets and depressions where runoff pools before drains can carry it away.',
    layers: ['low_lying'],
    nearbyKind: 'flood',
    group: 'water',
  },
  {
    id: 'monsoon',
    label: 'Monsoon hazard map',
    summary:
      'Flood points, low-lying areas, and primary rajakaluves together — a rainy-season picture of where water goes.',
    layers: ['flood', 'low_lying', 'drains'],
    nearbyKind: 'flood',
    group: 'water',
  },
  {
    id: 'water_systems',
    label: 'Valleys & rajakaluves',
    summary:
      'Three main valley watersheds and primary stormwater drains that carry runoff off the granite plateau.',
    layers: ['valleys', 'drains'],
    nearbyKind: 'none',
    group: 'water',
  },
  {
    id: 'valleys',
    label: 'Valley watersheds',
    summary:
      'Hebbal, Koramangala–Challaghatta, and Vrishabhavathi valley systems that shape where Bengaluru floods.',
    layers: ['valleys'],
    nearbyKind: 'none',
    group: 'water',
  },
  {
    id: 'drains',
    label: 'Primary rajakaluves',
    summary:
      'Primary stormwater drains from the MOD / CAG audit — blockages here often explain neighbourhood flooding.',
    layers: ['drains'],
    nearbyKind: 'none',
    group: 'water',
  },
  {
    id: 'lakes',
    label: 'Lakes & tanks',
    summary:
      'Existing tanks reconciled with BBMP / KTCDA lists — the historic cascade that once stored monsoon runoff.',
    layers: ['lakes'],
    nearbyKind: 'none',
    group: 'water',
  },
  {
    id: 'traffic',
    label: 'Traffic hotspots',
    summary:
      'Historically slow corridors where commute delays spike, often overlapping valley-floor bottlenecks.',
    layers: ['hotspots'],
    nearbyKind: 'hotspot',
    group: 'traffic',
  },
  {
    id: 'transit',
    label: 'Metro & BMTC hubs',
    summary:
      'Namma Metro stations and major BMTC interchanges — useful when you need to bail out of a jam (static snapshot, not live arrivals).',
    layers: ['transit'],
    nearbyKind: 'transit',
    group: 'traffic',
  },
  {
    id: 'commute',
    label: 'Commute escape routes',
    summary:
      'Traffic hotspots alongside Metro and BMTC hubs — where delays cluster and transit alternatives sit nearby.',
    layers: ['hotspots', 'transit'],
    nearbyKind: 'commute',
    group: 'traffic',
  },
  {
    id: 'monsoon_commute',
    label: 'Rainy-day commute',
    summary:
      'Flood-prone points, traffic hotspots, and Metro/BMTC hubs together — when monsoon rain and jams overlap.',
    layers: ['flood', 'hotspots', 'transit'],
    nearbyKind: 'commute',
    group: 'traffic',
  },
  {
    id: 'stories',
    label: 'Place stories',
    summary:
      'Short history and ecology notes for Bengaluru corridors — pick a story to read or listen.',
    layers: ['stories'],
    nearbyKind: 'none',
    group: 'culture',
  },
];

export const EXPLORE_TOPIC_GROUPS: { id: 'water' | 'traffic' | 'culture'; label: string }[] = [
  { id: 'water', label: 'Water & floods' },
  { id: 'traffic', label: 'Traffic & transit' },
  { id: 'culture', label: 'Culture & history' },
];

export const EXPLORE_LAYERS: { id: ExploreLayerId; label: string; description: string }[] = [
  {
    id: 'flood',
    label: 'Flood-prone points',
    description: 'BBMP / KSRSAC flood-prone locations (OpenCity)',
  },
  {
    id: 'low_lying',
    label: 'Low-lying areas',
    description: 'BBMP low-lying locations vulnerable to waterlogging',
  },
  {
    id: 'valleys',
    label: 'Valley systems',
    description: 'Hebbal, Koramangala–Challaghatta, Vrishabhavathi watersheds',
  },
  {
    id: 'drains',
    label: 'Primary rajakaluves',
    description: 'Primary stormwater drains (MOD / CAG audit)',
  },
  {
    id: 'lakes',
    label: 'Lakes (tanks)',
    description: 'Existing tanks reconciled with BBMP / KTCDA lists',
  },
  {
    id: 'hotspots',
    label: 'Traffic hotspots',
    description: 'Historically slow corridors (curated)',
  },
  {
    id: 'stories',
    label: 'Place stories',
    description: 'Short history and ecology notes for your commute',
  },
  {
    id: 'transit',
    label: 'Metro & BMTC hubs',
    description: 'Namma Metro stations and major BMTC interchange points (static snapshot)',
  },
];
