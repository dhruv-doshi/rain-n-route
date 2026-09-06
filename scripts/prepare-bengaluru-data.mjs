#!/usr/bin/env node
/**
 * Downloads (optional) and simplifies Bengaluru hazard GIS into src/data/bengaluru/.
 * Run: node scripts/prepare-bengaluru-data.mjs
 *
 * Requires raw files in data/bengaluru/raw/ (see data/bengaluru/SOURCES.md).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW = join(ROOT, 'data/bengaluru/raw');
const OUT = join(ROOT, 'src/data/bengaluru');
const MAX_TOTAL_BYTES = 450_000;

mkdirSync(OUT, { recursive: true });

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(name, data) {
  const content = JSON.stringify(data);
  writeFileSync(join(OUT, name), content);
  return content.length;
}

/** Keep every Nth coordinate; always keep first and last. */
function decimateRing(ring, step = 4) {
  if (ring.length <= 3) return ring.map(stripZ);
  const out = [stripZ(ring[0])];
  for (let i = step; i < ring.length - 1; i += step) {
    out.push(stripZ(ring[i]));
  }
  const last = stripZ(ring[ring.length - 1]);
  const tail = out[out.length - 1];
  if (tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

function stripZ(coord) {
  return [coord[0], coord[1]];
}

function simplifyPolygonCoords(coords, step = 6) {
  return coords.map((ring) => decimateRing(ring, step));
}

function simplifyMultiPolygon(coords, step = 6) {
  return coords.map((poly) => simplifyPolygonCoords(poly, step));
}

function extractLines(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates.map(stripZ)];
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates.map((line) => line.map(stripZ));
  }
  return [];
}

function parseKmlPoints(kml, category) {
  const features = [];
  const placemarkRe = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
  let m;
  while ((m = placemarkRe.exec(kml)) !== null) {
    const block = m[1];
    const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/i);
    const coordMatch = block.match(/<Point>\s*<coordinates>\s*([^<\s]+)/i);
    if (!coordMatch) continue;
    const parts = coordMatch[1].split(',');
    const lng = Number(parts[0]);
    const lat = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = (nameMatch?.[1] ?? 'Unknown').replace(/\s+/g, ' ').trim();
    features.push({
      id: `${category}-${features.length + 1}`,
      name,
      lat,
      lng,
      category,
      source: 'OpenCity / BBMP / KSRSAC',
    });
  }
  return features;
}

// ── Flood points from KML ──
const floodProne = parseKmlPoints(
  readFileSync(join(RAW, 'flood-prone.kml'), 'utf8'),
  'flood_prone',
);
const floodVulnerable = parseKmlPoints(
  readFileSync(join(RAW, 'flood-vulnerable.kml'), 'utf8'),
  'flood_vulnerable',
);
const lowLying = parseKmlPoints(
  readFileSync(join(RAW, 'low-lying.kml'), 'utf8'),
  'low_lying',
);

const floodPoints = [...floodProne, ...floodVulnerable];

// ── Valleys (simplify polygons, keep valley name) ──
const valleyRaw = readJson(join(RAW, 'valley.geojson'));
const valleys = valleyRaw.features.map((f, i) => ({
  id: `valley-${i + 1}`,
  name: f.properties.valley ?? `Valley ${i + 1}`,
  category: 'valley',
  source: 'MOD Foundation / HydroSHEDS',
  polygon:
    f.geometry.type === 'MultiPolygon'
      ? simplifyMultiPolygon(f.geometry.coordinates, 8)[0]
      : simplifyPolygonCoords(f.geometry.coordinates, 8),
}));

// ── Primary drains (sample features, decimate lines) ──
const drainsRaw = readJson(join(RAW, 'primarydrains.geojson'));
const drains = drainsRaw.features.slice(0, 120).map((f, i) => {
  const lines = extractLines(f.geometry);
  return {
    id: `drain-${i + 1}`,
    name: f.properties['Drain num'] ?? `Drain ${i + 1}`,
    valley: f.properties.valley ?? null,
    category: 'drain',
    source: 'MOD Foundation / OpenCity CAG audit',
    lines: lines.map((line) => decimateRing(line, 3)),
  };
});

// ── Lakes (centroid + simplified boundary, cap count) ──
const lakesRaw = readJson(join(RAW, 'lakes_existing.geojson'));
const lakes = lakesRaw.features.slice(0, 40).map((f, i) => {
  let polygon = null;
  if (f.geometry.type === 'Polygon') {
    polygon = simplifyPolygonCoords(f.geometry.coordinates, 5);
  } else if (f.geometry.type === 'MultiPolygon') {
    polygon = simplifyMultiPolygon(f.geometry.coordinates, 5)[0];
  }
  const name =
    f.properties?.Lake_Name ??
    f.properties?.name ??
    f.properties?.Name ??
    `Lake ${i + 1}`;
  return {
    id: `lake-${i + 1}`,
    name: String(name),
    category: 'lake',
    source: 'MOD Foundation / Well Labs / ATREE / KTCDA',
    polygon,
  };
});

// ── Curated traffic hotspots ──
const hotspots = [
  {
    id: 'hs-silk-board',
    name: 'Silk Board Junction',
    lat: 12.9176,
    lng: 77.6233,
    valley: 'Koramangala Challaghatta Valley',
    reason: 'ORR meets Hosur Road; chronic peak-hour jams, worse when rain blocks underpasses.',
    peakHours: '08:00–11:00, 17:30–21:00',
    source: 'Curated',
  },
  {
    id: 'hs-marathahalli',
    name: 'Marathahalli Bridge',
    lat: 12.9592,
    lng: 77.6974,
    valley: 'Koramangala Challaghatta Valley',
    reason: 'ORR choke point near Bellandur valley; water backs up from rajakaluve overflow.',
    peakHours: '09:00–11:00, 18:00–21:00',
    source: 'Curated',
  },
  {
    id: 'hs-hebbal',
    name: 'Hebbal Flyover',
    lat: 13.0358,
    lng: 77.597,
    valley: 'Hebbal Nagawara Valley',
    reason: 'Airport Road funnel; underpasses flood in heavy rain.',
    peakHours: '08:00–10:30, 17:00–20:00',
    source: 'Curated',
  },
  {
    id: 'hs-kr-puram',
    name: 'KR Puram Junction',
    lat: 13.0,
    lng: 77.6948,
    valley: 'Hebbal Nagawara Valley',
    reason: 'Old Madras Road + ORR; rail underpass floods frequently.',
    peakHours: '08:30–10:30, 18:00–20:30',
    source: 'Curated',
  },
  {
    id: 'hs-mekhri',
    name: 'Mekhri Circle',
    lat: 13.0054,
    lng: 77.5699,
    valley: 'Hebbal Nagawara Valley',
    reason: 'Multiple radial roads converge; railway underpass nearby.',
    peakHours: '08:00–10:00, 17:30–19:30',
    source: 'Curated',
  },
  {
    id: 'hs-tin-factory',
    name: 'Tin Factory',
    lat: 13.0047,
    lng: 77.6278,
    valley: 'Hebbal Nagawara Valley',
    reason: 'Old Madras Road bottleneck toward Whitefield.',
    peakHours: '09:00–11:00, 18:00–20:00',
    source: 'Curated',
  },
  {
    id: 'hs-bellandur',
    name: 'Bellandur Lake ORR stretch',
    lat: 12.9352,
    lng: 77.6785,
    valley: 'Koramangala Challaghatta Valley',
    reason: 'Low valley floor; lake overflow and drain backup during cloudbursts.',
    peakHours: '09:00–11:00, 18:00–21:00',
    source: 'Curated',
  },
  {
    id: 'hs-mysore-road',
    name: 'Mysore Road / Kengeri',
    lat: 12.914,
    lng: 77.487,
    valley: 'Vrishabhavati Valley',
    reason: 'Vrishabhavathi valley drainage; low stretches waterlog quickly.',
    peakHours: '08:30–10:30, 17:30–19:30',
    source: 'Curated',
  },
];

// ── Curated place stories ──
const stories = [
  {
    id: 'story-ulsoor',
    name: 'Ulsoor Lake',
    lat: 12.983,
    lng: 77.622,
    durationSec: 90,
    text: 'Ulsoor is one of Bengaluru\'s oldest tanks, built to harvest rainwater on granite terrain where water runs off rather than soaking in. When rajakaluves are blocked, this valley sends overflow toward the Koramangala–Challaghatta chain.',
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Ulsoor' }],
    source: 'Curated',
  },
  {
    id: 'story-bellandur',
    name: 'Bellandur Lake cascade',
    lat: 12.9352,
    lng: 77.6785,
    durationSec: 120,
    text: 'Bellandur sits in the Koramangala–Challaghatta valley. Historically, tanks here overflowed in sequence toward Varthur. Encroachment on rajakaluves means the same rain that once fed the lake now floods ORR underpasses.',
    links: [
      {
        label: 'Building a Resilient Bengaluru',
        url: 'https://buildingaresilientbengaluru.com/ecology-map/',
      },
    ],
    source: 'Curated',
  },
  {
    id: 'story-cubbon',
    name: 'Cubbon Park',
    lat: 12.976,
    lng: 77.592,
    durationSec: 75,
    text: 'Cubbon Park sits on higher ground relative to surrounding valleys. During heavy rain, water drains toward surrounding rajakaluves — one reason central Bengaluru often fares better than valley-floor corridors like Silk Board.',
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Cubbon_Park' }],
    source: 'Curated',
  },
  {
    id: 'story-pete',
    name: 'Bengaluru Pete',
    lat: 12.962,
    lng: 77.577,
    durationSec: 90,
    text: 'The Pete was the fortified heart of old Bengaluru. Robert Home\'s 1791 survey maps show a dense tank network here. Many of those tanks are now built over, but the valley systems still dictate where water goes when it rains.',
    links: [
      {
        label: 'MOD story map',
        url: 'https://buildingaresilientbengaluru.com/',
      },
    ],
    source: 'Curated',
  },
  {
    id: 'story-hebbal',
    name: 'Hebbal valley',
    lat: 13.0358,
    lng: 77.597,
    durationSec: 85,
    text: 'The Hebbal–Nagawara valley drains north toward the Arkavathi basin. Hebbal flyover and nearby underpasses are classic flood traps when storm drains cannot carry peak runoff from Yelahanka and Manyata corridors.',
    links: [{ label: 'OpenCity drains', url: 'https://data.opencity.in' }],
    source: 'Curated',
  },
  {
    id: 'story-bugle-rock',
    name: 'Bugle Rock',
    lat: 12.942,
    lng: 77.573,
    durationSec: 60,
    text: 'Bugle Rock is a dramatic granite outcrop in Basavanagudi — a reminder of Bengaluru\'s geology. Hard rock means rapid runoff into the Vrishabhavathi valley rather than absorption.',
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bugle_Rock' }],
    source: 'Curated',
  },
  {
    id: 'story-vidhana',
    name: 'Vidhana Soudha',
    lat: 12.9797,
    lng: 77.5907,
    durationSec: 70,
    text: 'Built in the 1950s when Bengaluru was still a garden city of tanks, Vidhana Soudha overlooks a landscape reshaped by decades of valley-floor development. The valleys below still collect the rain.',
    links: [{ label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Vidhana_Soudha' }],
    source: 'Curated',
  },
  {
    id: 'story-hal',
    name: 'HAL Old Airport',
    lat: 12.952,
    lng: 77.665,
    durationSec: 80,
    text: 'The old HAL airport corridor sits along the eastern valley slope. Marathahalli and Bellandur traffic converges here — a hotspot where commute delays and monsoon waterlogging often coincide.',
    links: [{ label: 'Bengawalk', url: 'https://bengawalk.com' }],
    source: 'Curated',
  },
];

// ── Static transit snapshot (Namma Metro + major BMTC hubs) ──
const transitStops = [
  {
    id: 'metro-majestic',
    name: 'Nadaprabhu Kempegowda Station (Majestic)',
    lat: 12.9767,
    lng: 77.5713,
    mode: 'metro',
    line: 'Purple / Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-indiranagar',
    name: 'Indiranagar',
    lat: 12.9784,
    lng: 77.6408,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-mg-road',
    name: 'MG Road',
    lat: 12.975,
    lng: 77.6066,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-cubbon-park',
    name: 'Cubbon Park',
    lat: 12.979,
    lng: 77.5928,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-vidhana-soudha',
    name: 'Dr. B. R. Ambedkar Station (Vidhana Soudha)',
    lat: 12.9797,
    lng: 77.5907,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-kr-puram',
    name: 'Krishnarajapura (KR Puram)',
    lat: 12.9998,
    lng: 77.6769,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-baiyappanahalli',
    name: 'Baiyappanahalli',
    lat: 12.9907,
    lng: 77.652,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-halasuru',
    name: 'Halasuru',
    lat: 12.9734,
    lng: 77.6274,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-ulsoor',
    name: 'Ulsoor',
    lat: 12.983,
    lng: 77.622,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-trinity',
    name: 'Trinity',
    lat: 12.973,
    lng: 77.608,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-chickpet',
    name: 'Chickpete',
    lat: 12.9674,
    lng: 77.5748,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-kr-market',
    name: 'Krishna Rajendra Market',
    lat: 12.9633,
    lng: 77.5746,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-national-college',
    name: 'National College',
    lat: 12.949,
    lng: 77.573,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-lalbagh',
    name: 'Lalbagh',
    lat: 12.9495,
    lng: 77.58,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-jayanagar',
    name: 'Jayanagar',
    lat: 12.9296,
    lng: 77.5801,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-rv-road',
    name: 'Rashtreeya Vidyalaya Road',
    lat: 12.9074,
    lng: 77.5733,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-banashankari',
    name: 'Banashankari',
    lat: 12.923,
    lng: 77.568,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-yeshwantpur',
    name: 'Yeshwantpur',
    lat: 13.0233,
    lng: 77.5498,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-peenya',
    name: 'Peenya',
    lat: 13.036,
    lng: 77.533,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-nagawara',
    name: 'Nagawara',
    lat: 13.0378,
    lng: 77.6103,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-sampige-road',
    name: 'Sampige Road',
    lat: 12.9905,
    lng: 77.5567,
    mode: 'metro',
    line: 'Green',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-hal',
    name: 'HAL Airport',
    lat: 12.9615,
    lng: 77.656,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-kadugodi',
    name: 'Kadugodi Tree Park',
    lat: 12.985,
    lng: 77.745,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'metro-whitefield',
    name: 'Whitefield (Kadugodi)',
    lat: 12.996,
    lng: 77.758,
    mode: 'metro',
    line: 'Purple',
    source: 'Curated from Namma Metro open data',
  },
  {
    id: 'bus-silk-board',
    name: 'Silk Board BMTC',
    lat: 12.918,
    lng: 77.622,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-hebbal',
    name: 'Hebbal Bus Terminal',
    lat: 13.035,
    lng: 77.597,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-shivajinagar',
    name: 'Shivajinagar Bus Station',
    lat: 12.9833,
    lng: 77.603,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-shantinagar',
    name: 'Shanthinagar TTMC',
    lat: 12.956,
    lng: 77.595,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-kormangala',
    name: 'Koramangala BMTC',
    lat: 12.935,
    lng: 77.614,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-marathahalli',
    name: 'Marathahalli Bridge BMTC',
    lat: 12.959,
    lng: 77.697,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-mysore-road',
    name: 'Mysore Road Satellite Bus',
    lat: 12.914,
    lng: 77.487,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
  {
    id: 'bus-electronic-city',
    name: 'Electronic City BMTC',
    lat: 12.8456,
    lng: 77.6603,
    mode: 'bus',
    source: 'Curated BMTC interchange snapshot',
  },
];

const sizes = {};
sizes['flood-points.json'] = writeJson('flood-points.json', floodPoints);
sizes['low-lying.json'] = writeJson('low-lying.json', lowLying);
sizes['valleys.json'] = writeJson('valleys.json', valleys);
sizes['drains-primary.json'] = writeJson('drains-primary.json', drains);
sizes['lakes.json'] = writeJson('lakes.json', lakes);
sizes['hotspots.json'] = writeJson('hotspots.json', hotspots);
sizes['stories.json'] = writeJson('stories.json', stories);
sizes['transit-stops.json'] = writeJson('transit-stops.json', transitStops);

const total = Object.values(sizes).reduce((a, b) => a + b, 0);
console.log('Wrote Bengaluru data pack:');
for (const [k, v] of Object.entries(sizes)) {
  console.log(`  ${k}: ${(v / 1024).toFixed(1)} KB`);
}
console.log(`  TOTAL: ${(total / 1024).toFixed(1)} KB`);

if (total > MAX_TOTAL_BYTES) {
  console.error(`ERROR: total ${total} bytes exceeds budget ${MAX_TOTAL_BYTES}`);
  process.exit(1);
}
