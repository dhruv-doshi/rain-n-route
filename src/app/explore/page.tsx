import { ExploreClient } from '@/components/explore/ExploreClient';

export const metadata = {
  title: 'Explore Bengaluru — Rain-N-Route',
  description:
    'Map flood-prone areas, valley systems, rajakaluves, lakes, and traffic hotspots across Bengaluru.',
};

export default function ExplorePage() {
  return <ExploreClient />;
}
