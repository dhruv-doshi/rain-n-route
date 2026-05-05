'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    // Sync initial state after mount — intentional setState in effect body
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>You&apos;re offline — showing cached data</span>
    </div>
  );
}
