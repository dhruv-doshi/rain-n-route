'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalNotifications } from '@/hooks/useLocalNotifications';
import { computeLeaveNow, todayAtTime } from '@/lib/leaveNow';

interface Props {
  durationSec: number;
  bufferMinutes?: number;
  routeLabel?: string;
}

type Status = 'idle' | 'scheduled' | 'fired' | 'late';

export function LeaveNowScheduler({ durationSec, bufferMinutes = 5, routeLabel }: Props) {
  const { permission, request, notify } = useLocalNotifications();
  const [arriveTime, setArriveTime] = useState(''); // HH:mm
  const [status, setStatus] = useState<Status>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function schedule() {
    const arriveMs = todayAtTime(arriveTime);
    if (!Number.isFinite(arriveMs)) return;

    const result = computeLeaveNow({
      arriveAtMs: arriveMs,
      durationSec,
      bufferMinutes,
    });

    if (result.isLate) {
      setStatus('late');
      return;
    }
    if (result.notifyAtMs == null) {
      setStatus('late');
      return;
    }

    if (permission === 'default') {
      const r = await request();
      if (r !== 'granted') return;
    }
    if (permission === 'denied' || permission === 'unsupported') return;

    const delay = Math.max(0, result.notifyAtMs - Date.now());
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const leaveAt = new Date(result.leaveAtMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      notify(`Time to leave for ${routeLabel ?? 'your trip'}`, {
        body: `Leave by ${leaveAt} to make it on time.`,
        tag: 'leave-now',
      });
      setStatus('fired');
    }, delay);
    setStatus('scheduled');
  }

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setStatus('idle');
  }

  if (permission === 'unsupported') return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 text-sm">
      <Bell className="size-4 shrink-0 text-brand" />
      <span className="text-muted-foreground">Notify me to leave by</span>
      <Input
        type="time"
        value={arriveTime}
        onChange={(e) => setArriveTime(e.target.value)}
        className="h-8 w-28"
        aria-label="Arrival time"
      />
      {status === 'scheduled' ? (
        <Button size="sm" variant="outline" onClick={cancel} className="gap-1.5">
          <BellOff className="size-3.5" />
          Cancel
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={schedule}
          disabled={!arriveTime || permission === 'denied'}
          className="gap-1.5"
        >
          <BellRing className="size-3.5" />
          Schedule
        </Button>
      )}
      {status === 'scheduled' && <span className="text-xs text-brand">Scheduled.</span>}
      {status === 'fired' && (
        <span className="text-xs text-green-700 dark:text-green-400">Notification sent.</span>
      )}
      {status === 'late' && (
        <span className="text-xs text-destructive">Already past leave time.</span>
      )}
      {permission === 'denied' && (
        <span className="text-xs text-destructive">Notifications blocked.</span>
      )}
    </div>
  );
}
