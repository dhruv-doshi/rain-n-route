import { NextRequest } from 'next/server';
import { z } from 'zod';
import { lruCache, validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getWeatherProvider } from '@/services';

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
    const bucketLat = Math.round(lat * 100) / 100;
    const bucketLng = Math.round(lng * 100) / 100;
    const cacheKey = `weather:aqi:${bucketLat},${bucketLng}`;

    const cached = lruCache.get(cacheKey);
    if (cached) return Response.json(cached, { headers: { 'X-Cache': 'HIT' } });

    const provider = getWeatherProvider();
    const aqi = await provider.airQuality({ lat, lng });

    lruCache.set(cacheKey, aqi, { ttl: 10 * 60_000 });
    return Response.json(aqi, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  });
}
