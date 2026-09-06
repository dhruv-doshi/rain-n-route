/** Parse a Wikipedia article title from a standard en.wikipedia.org URL. */
export function parseWikipediaTitleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('wikipedia.org')) return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    const wikiIdx = segments.indexOf('wiki');
    if (wikiIdx === -1 || !segments[wikiIdx + 1]) return null;
    return decodeURIComponent(segments[wikiIdx + 1].replace(/_/g, ' '));
  } catch {
    return null;
  }
}

/** Encode a title for the Wikipedia REST summary endpoint. */
export function encodeWikipediaTitle(title: string): string {
  return encodeURIComponent(title.trim().replace(/ /g, '_'));
}

export function truncateExtract(text: string, maxLen = 320): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
  wikipediaUrl: string;
  source: 'Wikipedia';
}

export function pickWikipediaLink(links: { label: string; url: string }[]): string | null {
  return links.find((l) => l.url.includes('wikipedia.org/wiki/'))?.url ?? null;
}
