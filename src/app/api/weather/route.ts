import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getWeatherProvider } from '@/services';

// ────────────────────────────────────────────────────────────────────
// Request validation schema
// ────────────────────────────────────────────────────────────────────

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  hours: z.coerce.number().int().min(1).max(48).default(12),
});

// ────────────────────────────────────────────────────────────────────
// GET /api/weather?lat=X&lng=Y&hours=12
// ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const { lat, lng, hours } = parsed.data;
    const coords = { lat, lng };

    const provider = getWeatherProvider();
    const [hourly, aqi] = await Promise.all([
      provider.hourly(coords, hours),
      provider.airQuality(coords),
    ]);

    return Response.json({ hourly, aqi }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  });
}
