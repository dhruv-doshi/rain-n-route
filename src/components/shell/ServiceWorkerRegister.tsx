'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production. No-op in dev (HMR + SW caching
 * fight each other) and on browsers without SW support.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is non-fatal.
    });
  }, []);
  return null;
}
