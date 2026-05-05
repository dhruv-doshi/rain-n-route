'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'cw:pwa-prompt-dismissed-at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1_000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function recentlyDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  const last = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Number.isFinite(last) && Date.now() - last < COOLDOWN_MS;
}

export function PWAInstallPrompt(): React.ReactElement | null {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recentlyDismissed()) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function onInstalled() {
      setVisible(false);
      setEvent(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  if (!visible || !event) return null;

  return (
    <div
      role="dialog"
      aria-label="Install CommuteWise"
      className="fixed inset-x-3 bottom-20 z-50 flex items-center gap-3 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-3 md:left-auto md:right-3 md:max-w-sm"
    >
      <Download className="size-5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Install CommuteWise</p>
        <p className="text-xs text-muted-foreground">Add to your home screen for quick access.</p>
      </div>
      <Button size="sm" onClick={handleInstall}>
        Install
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Dismiss" onClick={dismiss}>
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
