import { NextRequest } from 'next/server';
import { z } from 'zod';
import { lruCache, validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';

const schema = z.object({
  q: z.string().min(2),
});

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const { q } = parsed.data;
    const cacheKey = `geocode:${q}`;
    const cached = lruCache.get(cacheKey);
    if (cached) return Response.json({ results: cached }, { headers: { 'X-Cache': 'HIT' } });

    const provider = getMapsProvider();
    const results = await provider.geocode(q);

    lruCache.set(cacheKey, results);
    return Response.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  });
}
