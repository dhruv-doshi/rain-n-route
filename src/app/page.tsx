import { Cloud } from 'lucide-react';
import { FromToForm } from '@/components/planner/FromToForm';
import { TodaysCommuteCard } from '@/components/planner/TodaysCommuteCard';

export default function Home() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-muted px-3 py-1 text-xs font-medium text-brand">
          <Cloud className="size-3.5" />
          Weather-aware commute planner
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">
          Plan your commute. <span className="text-brand">Beat the rain.</span>
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Multi-modal routes with real-time weather, gear suggestions, and no account required.
        </p>
      </div>

      <FromToForm />

      <TodaysCommuteCard />
    </div>
  );
}
