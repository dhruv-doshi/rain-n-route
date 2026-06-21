import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validationErrorResponse, withRateLimit } from '@/lib/apiHelpers';
import { getMapsProvider } from '@/services';

const schema = z.object({
  placeId: z.string().min(1),
  sessionToken: z.string().min(1),
  label: z.string().default(''),
});

export async function GET(req: NextRequest): Promise<Response> {
  return withRateLimit(req, async () => {
    const params = Object.fromEntries(req.nextUrl.searchParams);

    // Reject with VALIDATION_ERROR if sessionToken is empty or missing
    if (!params.sessionToken || params.sessionToken.trim() === '') {
      return Response.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid session token is required',
            issues: [
              { path: ['sessionToken'], message: 'sessionToken must be a non-empty string' },
            ],
          },
        },
        { status: 400 },
      );
    }

    const parsed = schema.safeParse(params);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const { placeId, sessionToken, label } = parsed.data;

    const provider = getMapsProvider();
    const result = await provider.resolvePlace(placeId, {
      sessionToken,
      fallbackLabel: label,
    });

    return Response.json(result);
  });
}
