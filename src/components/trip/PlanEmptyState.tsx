import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export function PlanEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <MapPin className="size-10 text-muted-foreground" />
      <div>
        <p className="font-medium">No routes found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try different locations or a different departure time.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ variant: 'outline' })}>
        Back to planner
      </Link>
    </div>
  );
}
