import { NextRequest } from 'next/server';
import { z } from 'zod';
import { lruCache, validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const schema = z.object({
  from: latLngSchema,
  to: latLngSchema,
  modes: z.array(
    z.enum(['car', 'two_wheeler', 'transit', 'cab', 'auto', 'walk', 'cycle', 'mixed']),
  ),
  departAt: z.string().datetime({ offset: true }).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
        { status: 400 },
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const reqData = parsed.data;
    const cacheKey = `route:${reqData.from.lat},${reqData.from.lng}-${reqData.to.lat},${reqData.to.lng}-${reqData.modes.join(',')}`;
    // Polling consumers pass ?fresh=1 to bypass the read-side LRU so they can
    // detect duration changes upstream. Writes still happen so other clients benefit.
    const skipCacheRead = req.nextUrl.searchParams.get('fresh') === '1';
    if (!skipCacheRead) {
      const cached = lruCache.get(cacheKey);
      if (cached) return Response.json(cached, { headers: { 'X-Cache': 'HIT' } });
    }

    const provider = getMapsProvider();
    const result = await provider.route(reqData);

    lruCache.set(cacheKey, result);
    return Response.json(result, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  });
}
