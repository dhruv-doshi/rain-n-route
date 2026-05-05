'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/telemetry';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-3 size-10 text-destructive" />
      <h1 className="mb-1 text-xl font-semibold">Something went wrong</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        An unexpected error stopped the page. You can try reloading.
      </p>
      <Button onClick={reset} className="gap-1.5">
        <RotateCcw className="size-3.5" />
        Reload
      </Button>
    </div>
  );
}
