import type { CommuteLogEntry, TransportMode, WeeklyInsight, ISODateTime, Paise } from '@/types';

export interface ModeAggregate {
  mode: TransportMode;
  commutes: number;
  minutes: number;
}

/** Pure: aggregate entries by mode. Used for the by-mode chart. */
export function aggregateByMode(entries: CommuteLogEntry[]): ModeAggregate[] {
  const map = new Map<TransportMode, ModeAggregate>();
  for (const e of entries) {
    const dur = e.actualDuration ?? e.estimatedDuration;
    const cur = map.get(e.mode) ?? { mode: e.mode, commutes: 0, minutes: 0 };
    cur.commutes += 1;
    cur.minutes += Math.round(dur / 60);
    map.set(e.mode, cur);
  }
  return [...map.values()].sort((a, b) => b.commutes - a.commutes);
}

/** ISO date → start-of-week (Monday) ISO string. */
function startOfWeek(iso: ISODateTime): string {
  const d = new Date(iso);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday as week start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Pure: aggregate entries into a weekly summary. Returns the latest week. */
export function computeWeeklyInsight(
  entries: CommuteLogEntry[],
  referenceIso?: ISODateTime,
): WeeklyInsight | null {
  if (entries.length === 0) return null;
  const ref = referenceIso ?? entries[0].date;
  const weekStart = startOfWeek(ref);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndIso = weekEnd.toISOString();

  const inWeek = entries.filter((e) => e.date >= weekStart && e.date < weekEndIso);
  if (inWeek.length === 0) return null;

  let totalMinutes = 0;
  let totalSpend: Paise = 0;
  const totalCarbon = 0; // not yet tracked in CommuteLogEntry
  const byMode = {} as WeeklyInsight['byMode'];

  for (const e of inWeek) {
    const dur = e.actualDuration ?? e.estimatedDuration;
    const minutes = Math.round(dur / 60);
    totalMinutes += minutes;
    totalSpend += e.actualCost ?? e.estimatedCost ?? 0;
    if (!byMode[e.mode]) byMode[e.mode] = { commutes: 0, minutes: 0 };
    byMode[e.mode].commutes += 1;
    byMode[e.mode].minutes += minutes;
  }

  return {
    weekStart,
    totalCommutes: inWeek.length,
    totalMinutes,
    totalSpendPaise: totalSpend,
    totalCarbonGrams: totalCarbon,
    byMode,
  };
}
