import { NextRequest } from 'next/server';
import { z } from 'zod';
import { lruCache, validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const { lat, lng } = parsed.data;
    // Round to 4 decimal places (~11m) for cache bucketing
    const bucketLat = Math.round(lat * 10_000) / 10_000;
    const bucketLng = Math.round(lng * 10_000) / 10_000;
    const cacheKey = `reverse-geocode:${bucketLat},${bucketLng}`;

    const cached = lruCache.get(cacheKey);
    if (cached) return Response.json({ result: cached }, { headers: { 'X-Cache': 'HIT' } });

    const provider = getMapsProvider();
    const result = await provider.reverseGeocode({ lat, lng });

    lruCache.set(cacheKey, result);
    return Response.json({ result }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  });
}
