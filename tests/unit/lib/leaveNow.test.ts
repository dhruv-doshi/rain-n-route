import { describe, it, expect } from 'vitest';
import { computeLeaveNow, todayAtTime } from '@/lib/leaveNow';

const ONE_MIN = 60 * 1_000;

describe('computeLeaveNow', () => {
  it('schedules leaveAt = arrive - duration - buffer', () => {
    const arrive = 60 * 60 * 1_000; // 1 hour from epoch (just for math)
    const r = computeLeaveNow({
      arriveAtMs: arrive,
      durationSec: 30 * 60, // 30 minutes
      bufferMinutes: 5,
      nowMs: 0,
    });
    // leaveAt = arrive - 35 min
    expect(r.leaveAtMs).toBe(arrive - 35 * ONE_MIN);
  });

  it('notifyAtMs is 5 min before leaveAt', () => {
    const arrive = 60 * 60 * 1_000;
    const r = computeLeaveNow({
      arriveAtMs: arrive,
      durationSec: 30 * 60,
      bufferMinutes: 0,
      nowMs: 0,
    });
    expect(r.notifyAtMs).toBe(r.leaveAtMs - 5 * ONE_MIN);
  });

  it('notifyAtMs is null when notify time is in the past', () => {
    const arrive = 10 * ONE_MIN; // 10 minutes from now
    const r = computeLeaveNow({
      arriveAtMs: arrive,
      durationSec: 30 * 60, // 30 min — already late
      bufferMinutes: 0,
      nowMs: 0,
    });
    expect(r.notifyAtMs).toBeNull();
    expect(r.isLate).toBe(true);
  });

  it('isLate true when leaveAt <= now', () => {
    const arrive = 0; // arrive at "now"
    const r = computeLeaveNow({
      arriveAtMs: arrive,
      durationSec: 1,
      bufferMinutes: 0,
      nowMs: 0,
    });
    expect(r.isLate).toBe(true);
  });

  it('isLate false when there is time to spare', () => {
    const r = computeLeaveNow({
      arriveAtMs: 60 * ONE_MIN,
      durationSec: 10 * 60,
      bufferMinutes: 5,
      nowMs: 0,
    });
    expect(r.isLate).toBe(false);
  });
});

describe('todayAtTime', () => {
  it('parses HH:mm and returns today at that time', () => {
    const now = new Date('2026-05-04T12:00:00Z').getTime();
    const t = todayAtTime('09:30', now);
    const d = new Date(t);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it('returns NaN for malformed input', () => {
    expect(todayAtTime('not-a-time')).toBeNaN();
  });
});
