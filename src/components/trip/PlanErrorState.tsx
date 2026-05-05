import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  error: string;
  onRetry: () => void;
}

export function PlanErrorState({ error, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <AlertCircle className="size-10 text-destructive" />
      <div>
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
