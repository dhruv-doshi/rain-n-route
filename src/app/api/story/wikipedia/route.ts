import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  lruCache,
  validationErrorResponse,
  withRateLimit,
  serviceErrorResponse,
  unknownErrorResponse,
} from '@/lib/apiHelpers';
import { assertOk, fetchWithRetry, ServiceError } from '@/lib/http';
import {
  encodeWikipediaTitle,
  parseWikipediaTitleFromUrl,
  truncateExtract,
  type WikipediaSummary,
} from '@/lib/wikipedia';

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
});

interface WikiRestSummary {
  title?: string;
  extract?: string;
  description?: string;
  content_urls?: { desktop?: { page?: string } };
}

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const title =
      parsed.data.title ?? (parsed.data.url ? parseWikipediaTitleFromUrl(parsed.data.url) : null);
    if (!title) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing or invalid Wikipedia title/url' } },
        { status: 400 },
      );
    }

    const cacheKey = `wiki:${title.toLowerCase()}`;
    const cached = lruCache.get(cacheKey);
    if (cached) {
      return Response.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=86400' },
      });
    }

    try {
      const encoded = encodeWikipediaTitle(title);
      const res = await fetchWithRetry(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
        {
          headers: { Accept: 'application/json' },
          timeoutMs: 8000,
          retries: 1,
        },
      );

      if (res.status === 404) {
        return Response.json(
          {
            error: { code: 'NOT_FOUND', message: 'Wikipedia article not found', retryable: false },
          },
          { status: 404 },
        );
      }

      await assertOk(res);
      const body = (await res.json()) as WikiRestSummary;
      if (!body.extract) {
        return Response.json(
          { error: { code: 'NOT_FOUND', message: 'No extract available', retryable: false } },
          { status: 404 },
        );
      }

      const summary: WikipediaSummary = {
        title: body.title ?? title,
        extract: truncateExtract(body.extract),
        description: body.description,
        wikipediaUrl:
          body.content_urls?.desktop?.page ??
          `https://en.wikipedia.org/wiki/${encodeWikipediaTitle(title)}`,
        source: 'Wikipedia',
      };

      lruCache.set(cacheKey, summary, { ttl: 24 * 60 * 60_000 });
      return Response.json(summary, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
    } catch (err) {
      if (err instanceof ServiceError) return serviceErrorResponse(err);
      return unknownErrorResponse();
    }
  });
}
