import { ExploreClient } from '@/components/explore/ExploreClient';
import { DEFAULT_EXPLORE_TOPIC } from '@/lib/bengaluruData';
import { parseExploreTopicId } from '@/lib/exploreSearch';

export const metadata = {
  title: 'Explore Bengaluru — Rain-N-Route',
  description:
    'Map flood-prone areas, valley systems, rajakaluves, lakes, and traffic hotspots across Bengaluru.',
};

interface Props {
  searchParams: Promise<{ topic?: string }>;
}

export default async function ExplorePage({ searchParams }: Props) {
  const { topic } = await searchParams;
  const initialTopicId = parseExploreTopicId(topic) ?? DEFAULT_EXPLORE_TOPIC;

  return <ExploreClient initialTopicId={initialTopicId} />;
}
