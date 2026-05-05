import { NextRequest } from 'next/server';
import { z } from 'zod';
import { lruCache, validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';

const schema = z.object({
  routeId: z.string().min(1),
});

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const { routeId } = parsed.data;
    const cacheKey = `traffic:${routeId}`;

    // Traffic is fresh for only 60s
    const cached = lruCache.get(cacheKey);
    if (cached) return Response.json(cached, { headers: { 'X-Cache': 'HIT' } });

    const provider = getMapsProvider();
    const snapshot = await provider.trafficFor(routeId);

    lruCache.set(cacheKey, snapshot, { ttl: 60_000 });
    return Response.json(snapshot, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
  });
}
