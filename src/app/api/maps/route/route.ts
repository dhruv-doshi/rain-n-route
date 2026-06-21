import { NextRequest } from 'next/server';
import { z } from 'zod';
import { LRUCache } from 'lru-cache';
import { validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';
import { buildCacheKey } from '@/services/maps/google';
import type { RouteResponse } from '@/types';

// ────────────────────────────────────────────────────────────────────
// Route-specific LRU cache: 100 entries max, 5-minute TTL
// ────────────────────────────────────────────────────────────────────

export const routeCache = new LRUCache<string, RouteResponse>({
  max: 100,
  ttl: 5 * 60 * 1_000, // 300,000ms
});

// ────────────────────────────────────────────────────────────────────
// Request validation schema
// ────────────────────────────────────────────────────────────────────

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const schema = z.object({
  from: latLngSchema,
  to: latLngSchema,
  modes: z.array(
    z.enum(['car', 'two_wheeler', 'transit', 'cab', 'auto', 'walk', 'cycle', 'mixed']),
  ),
  departAt: z.string().datetime({ offset: true }).optional(),
});

// ────────────────────────────────────────────────────────────────────
// POST /api/maps/route
// ────────────────────────────────────────────────────────────────────

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

    // Build deterministic cache key (coords rounded to 4dp, modes sorted, time bucketed)
    const cacheKey = buildCacheKey(reqData);

    // ?fresh=1 bypasses cache read but still writes result to cache
    const skipCacheRead = req.nextUrl.searchParams.get('fresh') === '1';

    if (!skipCacheRead) {
      const cached = routeCache.get(cacheKey);
      if (cached) {
        return Response.json(cached, { headers: { 'X-Cache': 'HIT' } });
      }
    }

    const provider = getMapsProvider();
    const result = await provider.route(reqData);

    // Only cache successful responses (errors are never cached — they throw above)
    routeCache.set(cacheKey, result);

    return Response.json(result, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=300' },
    });
  });
}
