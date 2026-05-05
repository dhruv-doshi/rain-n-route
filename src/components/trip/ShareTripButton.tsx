'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { encodeShareToken, type SharePayload } from '@/services/share';

interface Props {
  payload: SharePayload | null;
}

export function ShareTripButton({ payload }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (!payload) return;
    const token = encodeShareToken(payload);
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Fallback: open the URL so the user can copy from the address bar.
      window.prompt('Copy this share link:', url);
    }
  }

  if (!payload) return null;

  return (
    <Button size="sm" variant="outline" onClick={handleShare} className="gap-1.5">
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? 'Copied' : 'Share'}
    </Button>
  );
}
