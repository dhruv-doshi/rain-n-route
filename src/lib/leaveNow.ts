/**
 * Pure scheduling math for "leave now" notifications.
 *
 * Given a desired arrival time, an expected travel duration, and a buffer,
 * return the moment to fire a notification ("leave at HH:mm to make it on time").
 */

export interface LeaveNowInputs {
  /** When the user wants to arrive (epoch ms). */
  arriveAtMs: number;
  /** Expected travel duration (seconds). */
  durationSec: number;
  /** Extra buffer the user wants (minutes). */
  bufferMinutes: number;
  /** Now, in epoch ms. Defaulted to Date.now() when called without args. */
  nowMs?: number;
}

export interface LeaveNowResult {
  /** When to leave (epoch ms). May be in the past if already late. */
  leaveAtMs: number;
  /** When to fire a notification (epoch ms). null if it should fire immediately or if already past. */
  notifyAtMs: number | null;
  /** True if the user is already past or at the leave time. */
  isLate: boolean;
}

const NOTIFY_LEAD_MINUTES = 5;

export function computeLeaveNow(inputs: LeaveNowInputs): LeaveNowResult {
  const now = inputs.nowMs ?? Date.now();
  const totalMs = (inputs.durationSec + inputs.bufferMinutes * 60) * 1_000;
  const leaveAtMs = inputs.arriveAtMs - totalMs;
  const notifyAtMs = leaveAtMs - NOTIFY_LEAD_MINUTES * 60 * 1_000;
  return {
    leaveAtMs,
    notifyAtMs: notifyAtMs > now ? notifyAtMs : null,
    isLate: leaveAtMs <= now,
  };
}

/** Convert a "HH:mm" depart time on today's date to epoch ms. */
export function todayAtTime(hhmm: string, nowMs: number = Date.now()): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.NaN;
  const d = new Date(nowMs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
