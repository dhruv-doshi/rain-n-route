import { http, HttpResponse } from 'msw';

// Weather fixtures
import owmOnecall from '../../fixtures/owm-onecall.json';
import owmAqi from '../../fixtures/owm-aqi.json';

// Google Maps fixtures
import googleAutocomplete from '../../fixtures/google-autocomplete.json';
import googlePlaceDetails from '../../fixtures/google-place-details.json';
import googleGeocode from '../../fixtures/google-geocode.json';
import googleReverseGeocode from '../../fixtures/google-reverse-geocode.json';
import googleRoutesDrive from '../../fixtures/google-routes-drive.json';
import googleRoutesTwoWheeler from '../../fixtures/google-routes-two-wheeler.json';
import googleRoutesTransit from '../../fixtures/google-routes-transit.json';
import googleRoutesWalk from '../../fixtures/google-routes-walk.json';

// ────────────────────────────────────────────────────────────────────
// Request tracking for assertion (Google handlers)
// ────────────────────────────────────────────────────────────────────

export const requestLog: {
  autocomplete: Request[];
  placeDetails: Request[];
  geocode: Request[];
  routes: Request[];
} = {
  autocomplete: [],
  placeDetails: [],
  geocode: [],
  routes: [],
};

export function resetRequestLog() {
  requestLog.autocomplete = [];
  requestLog.placeDetails = [];
  requestLog.geocode = [];
  requestLog.routes = [];
}

// ────────────────────────────────────────────────────────────────────
// Google Maps API Handlers
// ────────────────────────────────────────────────────────────────────

const GOOGLE_MODE_FIXTURES: Record<string, object> = {
  DRIVE: googleRoutesDrive,
  TWO_WHEELER: googleRoutesTwoWheeler,
  TRANSIT: googleRoutesTransit,
  WALK: googleRoutesWalk,
  BICYCLE: googleRoutesWalk,
};

export const googleMapsHandlers = [
  // Places Autocomplete (New API)
  http.post('https://places.googleapis.com/v1/places:autocomplete', async ({ request }) => {
    requestLog.autocomplete.push(request.clone());
    return HttpResponse.json(googleAutocomplete);
  }),

  // Place Details (New API)
  http.get('https://places.googleapis.com/v1/places/:placeId', async ({ request }) => {
    requestLog.placeDetails.push(request.clone());
    return HttpResponse.json(googlePlaceDetails);
  }),

  // Geocode API (forward + reverse)
  http.get('https://maps.googleapis.com/maps/api/geocode/json', async ({ request }) => {
    requestLog.geocode.push(request.clone());
    const url = new URL(request.url);
    const latlng = url.searchParams.get('latlng');
    if (latlng) {
      return HttpResponse.json(googleReverseGeocode);
    }
    return HttpResponse.json(googleGeocode);
  }),

  // Routes API
  http.post('https://routes.googleapis.com/directions/v2:computeRoutes', async ({ request }) => {
    requestLog.routes.push(request.clone());
    const body = (await request.json()) as { travelMode?: string };
    const mode = body.travelMode ?? 'DRIVE';
    const fixture = GOOGLE_MODE_FIXTURES[mode] ?? googleRoutesDrive;
    return HttpResponse.json(fixture);
  }),
];

// ────────────────────────────────────────────────────────────────────
// Google Error Handlers
// ────────────────────────────────────────────────────────────────────

export const googleErrorHandlers = {
  autocomplete400: http.post(
    'https://places.googleapis.com/v1/places:autocomplete',
    () => new HttpResponse(JSON.stringify({ error: { message: 'Bad request' } }), { status: 400 }),
  ),
  autocomplete403: http.post(
    'https://places.googleapis.com/v1/places:autocomplete',
    () => new HttpResponse(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403 }),
  ),
  autocomplete429: http.post(
    'https://places.googleapis.com/v1/places:autocomplete',
    () => new HttpResponse(JSON.stringify({ error: { message: 'Rate limited' } }), { status: 429 }),
  ),
  autocomplete500: http.post(
    'https://places.googleapis.com/v1/places:autocomplete',
    () =>
      new HttpResponse(JSON.stringify({ error: { message: 'Internal error' } }), { status: 500 }),
  ),
  autocompleteEmpty: http.post('https://places.googleapis.com/v1/places:autocomplete', () =>
    HttpResponse.json({ suggestions: [] }),
  ),
  autocompleteMalformed: http.post('https://places.googleapis.com/v1/places:autocomplete', () =>
    HttpResponse.json({
      suggestions: [
        { placePrediction: null },
        {
          /* no placePrediction field */
        },
        {
          placePrediction: {
            placeId: 'ChIJ_valid',
            text: { text: 'Valid' },
            structuredFormat: {
              mainText: { text: 'Valid' },
              secondaryText: { text: 'Place' },
            },
            types: [],
          },
        },
      ],
    }),
  ),
  placeDetailsMissingLocation: http.get('https://places.googleapis.com/v1/places/:placeId', () =>
    HttpResponse.json({
      id: 'ChIJ_test',
      formattedAddress: 'Some Place',
      location: undefined,
      types: [],
    }),
  ),
  placeDetailsInvalidId: http.get(
    'https://places.googleapis.com/v1/places/:placeId',
    () => new HttpResponse(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 }),
  ),
  placeDetailsQuotaError: http.get(
    'https://places.googleapis.com/v1/places/:placeId',
    () =>
      new HttpResponse(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 }),
  ),
  geocodeZeroResults: http.get(
    'https://maps.googleapis.com/maps/api/geocode/json',
    ({ request }) => {
      const url = new URL(request.url);
      const address = url.searchParams.get('address');
      if (address) {
        return HttpResponse.json({ results: [], status: 'ZERO_RESULTS' });
      }
      return HttpResponse.json({ results: [], status: 'ZERO_RESULTS' });
    },
  ),
  reverseGeocodeZeroResults: http.get('https://maps.googleapis.com/maps/api/geocode/json', () =>
    HttpResponse.json({ results: [], status: 'ZERO_RESULTS' }),
  ),
  routesDrive500: http.post(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    () => new HttpResponse(JSON.stringify({ error: { message: 'Server error' } }), { status: 500 }),
  ),
};

// ────────────────────────────────────────────────────────────────────
// Weather Handlers
// ────────────────────────────────────────────────────────────────────

export const weatherHandlers = [
  http.get('https://api.openweathermap.org/data/3.0/onecall', () => HttpResponse.json(owmOnecall)),
  http.get('https://api.openweathermap.org/data/2.5/air_pollution', () =>
    HttpResponse.json(owmAqi),
  ),
];

// ────────────────────────────────────────────────────────────────────
// Weather Error Handlers
// ────────────────────────────────────────────────────────────────────

export const errorHandlers = {
  owmOnecall504: http.get(
    'https://api.openweathermap.org/data/3.0/onecall',
    () => new HttpResponse(null, { status: 504 }),
  ),
};
