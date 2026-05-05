import { http, HttpResponse } from 'msw';
import mmiToken from '../../fixtures/mmi-token.json';
import mmiAutosuggest from '../../fixtures/mmi-autosuggest.json';
import mmiRoute from '../../fixtures/mmi-route.json';
import nominatimSearch from '../../fixtures/nominatim-search.json';
import nominatimReverse from '../../fixtures/nominatim-reverse.json';
import owmOnecall from '../../fixtures/owm-onecall.json';
import owmAqi from '../../fixtures/owm-aqi.json';

export const mapsHandlers = [
  http.post('https://outpost.mapmyindia.com/api/security/oauth/token', () =>
    HttpResponse.json(mmiToken),
  ),
  http.get('https://atlas.mapmyindia.com/api/places/search/json', () =>
    HttpResponse.json(mmiAutosuggest),
  ),
  http.get('https://nominatim.openstreetmap.org/search', () => HttpResponse.json(nominatimSearch)),
  http.get('https://nominatim.openstreetmap.org/reverse', () =>
    HttpResponse.json(nominatimReverse),
  ),
  http.get(/apis\.mapmyindia\.com\/advancedmaps\/v1\/.+\/route_adv/, () =>
    HttpResponse.json(mmiRoute),
  ),
  http.get('https://apis.mapmyindia.com/traffic/api/v2', () =>
    HttpResponse.json({ segments: [], total_delay: 0 }),
  ),
];

export const weatherHandlers = [
  http.get('https://api.openweathermap.org/data/3.0/onecall', () => HttpResponse.json(owmOnecall)),
  http.get('https://api.openweathermap.org/data/2.5/air_pollution', () =>
    HttpResponse.json(owmAqi),
  ),
];

export const errorHandlers = {
  mmiTokenNetworkError: http.post('https://outpost.mapmyindia.com/api/security/oauth/token', () =>
    HttpResponse.error(),
  ),
  mmiAutosuggest500: http.get(
    'https://atlas.mapmyindia.com/api/places/search/json',
    () => new HttpResponse(null, { status: 500 }),
  ),
  owmOnecall504: http.get(
    'https://api.openweathermap.org/data/3.0/onecall',
    () => new HttpResponse(null, { status: 504 }),
  ),
};
