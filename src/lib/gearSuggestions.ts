import type { GearItem, RiskFactor, RiskLevel } from '@/types';

const LEVEL_ORDER: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };

type GearRule = {
  factorKind: RiskFactor['kind'];
  minLevel: RiskLevel;
  item: GearItem;
};

const RULES: GearRule[] = [
  {
    factorKind: 'rain',
    minLevel: 'moderate',
    item: { id: 'umbrella', label: 'Umbrella', reason: 'Rain expected along your route' },
  },
  {
    factorKind: 'rain',
    minLevel: 'high',
    item: { id: 'raincoat', label: 'Raincoat', reason: 'Heavy rain expected — stay dry' },
  },
  {
    factorKind: 'flood',
    minLevel: 'moderate',
    item: { id: 'raincoat', label: 'Raincoat', reason: 'Flooding risk — waterproof gear advised' },
  },
  {
    factorKind: 'aqi',
    minLevel: 'moderate',
    item: { id: 'mask', label: 'Mask', reason: 'Poor air quality along your route' },
  },
  {
    factorKind: 'heat',
    minLevel: 'moderate',
    item: { id: 'water', label: 'Water bottle', reason: 'High temperature — stay hydrated' },
  },
  {
    factorKind: 'heat',
    minLevel: 'high',
    item: { id: 'sunscreen', label: 'Sunscreen', reason: 'Extreme heat — protect your skin' },
  },
];

/** Returns a deduplicated list of gear items based on active risk factors. */
export function suggestGear(factors: RiskFactor[]): GearItem[] {
  const seen = new Set<GearItem['id']>();
  const gear: GearItem[] = [];

  for (const rule of RULES) {
    const match = factors.find((f) => f.kind === rule.factorKind);
    if (!match) continue;
    if (LEVEL_ORDER[match.level] < LEVEL_ORDER[rule.minLevel]) continue;
    if (seen.has(rule.item.id)) continue;
    seen.add(rule.item.id);
    gear.push(rule.item);
  }

  return gear;
}
