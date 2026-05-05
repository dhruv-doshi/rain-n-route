import type { Metadata } from 'next';
import { TripPlanClient } from '@/components/trip/TripPlanClient';
import { getMapsProvider } from '@/services';

export const metadata: Metadata = {
  title: 'Plan your trip — CommuteWise',
};

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function TripPlanPage({ searchParams }: Props) {
  const { from = '', to = '' } = await searchParams;
  const maps = getMapsProvider();
  return (
    <TripPlanClient
      rawFrom={from}
      rawTo={to}
      baseTilesUrl={maps.tilesUrl('base')}
      trafficTilesUrl={maps.tilesUrl('traffic')}
      transitTilesUrl={maps.tilesUrl('transit')}
    />
  );
}
