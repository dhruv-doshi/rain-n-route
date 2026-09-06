import { describe, it, expect } from 'vitest';
import { searchExploreFeatures, parseExploreTopicId, isExploreTopicId } from '@/lib/exploreSearch';

describe('searchExploreFeatures', () => {
  it('returns empty for short queries', () => {
    expect(searchExploreFeatures('a')).toEqual([]);
  });

  it('finds flood points by name fragment', () => {
    const hits = searchExploreFeatures('bhadrappa');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.category).toMatch(/flood/i);
  });

  it('finds metro stops', () => {
    const hits = searchExploreFeatures('indiranagar');
    expect(hits.some((h) => h.category === 'Metro')).toBe(true);
  });
});

describe('parseExploreTopicId', () => {
  it('parses valid topic ids', () => {
    expect(parseExploreTopicId('transit')).toBe('transit');
    expect(parseExploreTopicId('monsoon_commute')).toBe('monsoon_commute');
  });

  it('rejects invalid topic ids', () => {
    expect(parseExploreTopicId('invalid')).toBeNull();
    expect(isExploreTopicId('nope')).toBe(false);
  });
});
