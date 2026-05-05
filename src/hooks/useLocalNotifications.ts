'use client';

import { useEffect, useState, useCallback } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface UseLocalNotificationsResult {
  permission: NotificationPermissionState;
  request: () => Promise<NotificationPermissionState>;
  notify: (title: string, options?: NotificationOptions) => Notification | null;
}

/**
 * Wraps the browser Notification API with a deferred-permission UX.
 *
 * Push notifications via Service Worker would require a backend (VAPID +
 * push service). Out of scope; we ship local notifications only — they fire
 * while the tab is open. The hook is SSR-safe.
 */
export function useLocalNotifications(): UseLocalNotificationsResult {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);
  }, []);

  const request = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission as NotificationPermissionState;
    }
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermissionState);
    return result as NotificationPermissionState;
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (typeof Notification === 'undefined') return null;
      if (Notification.permission !== 'granted') return null;
      try {
        return new Notification(title, options);
      } catch {
        return null;
      }
    },
    [],
  );

  return { permission, request, notify };
}
