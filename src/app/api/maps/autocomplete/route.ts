import { NextRequest } from 'next/server';
import { z } from 'zod';
import { lruCache, validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';

const schema = z.object({
  q: z.string().min(2),
  sessionToken: z.string().min(1),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const { q, sessionToken, lat, lng } = parsed.data;
    const cacheKey = `autocomplete:${q}`;
    const cached = lruCache.get(cacheKey);
    if (cached) {
      return Response.json({ suggestions: cached }, { headers: { 'X-Cache': 'HIT' } });
    }

    const provider = getMapsProvider();
    const bias = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
    const suggestions = await provider.autocomplete(q, { sessionToken, bias });

    lruCache.set(cacheKey, suggestions);
    return Response.json(
      { suggestions },
      { headers: { 'Cache-Control': 'public, s-maxage=60', 'X-Cache': 'MISS' } },
    );
  });
}
