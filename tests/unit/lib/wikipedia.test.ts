import { describe, it, expect } from 'vitest';
import {
  encodeWikipediaTitle,
  parseWikipediaTitleFromUrl,
  truncateExtract,
  pickWikipediaLink,
} from '@/lib/wikipedia';

describe('wikipedia helpers', () => {
  it('parses title from Wikipedia URL', () => {
    expect(parseWikipediaTitleFromUrl('https://en.wikipedia.org/wiki/Cubbon_Park')).toBe(
      'Cubbon Park',
    );
  });

  it('encodes title for REST API', () => {
    expect(encodeWikipediaTitle('Cubbon Park')).toBe('Cubbon_Park');
  });

  it('truncates long extracts at word boundary', () => {
    const long = 'word '.repeat(100);
    expect(truncateExtract(long, 50).endsWith('…')).toBe(true);
  });

  it('picks first Wikipedia link from story links', () => {
    const url = pickWikipediaLink([
      { label: 'MOD', url: 'https://example.com' },
      { label: 'Wiki', url: 'https://en.wikipedia.org/wiki/Ulsoor' },
    ]);
    expect(url).toContain('Ulsoor');
  });
});
