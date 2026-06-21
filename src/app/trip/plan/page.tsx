import type { Metadata } from 'next';
import { TripPlanClient } from '@/components/trip/TripPlanClient';

export const metadata: Metadata = {
  title: 'Plan your trip — Rain-N-Route',
};

interface Props {
  searchParams: Promise<{ from?: string; to?: string; departAt?: string }>;
}

export default async function TripPlanPage({ searchParams }: Props) {
  const { from = '', to = '', departAt } = await searchParams;
  return <TripPlanClient rawFrom={from} rawTo={to} departAt={departAt} />;
}
