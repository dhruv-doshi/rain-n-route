import { assertOk, fetchWithRetry } from '@/lib/http';
import type { AQIReading, CurrentWeather, HourlyForecast, LatLng, WeatherCondition } from '@/types';
import type { WeatherProvider } from './types';

const OWM_BASE = 'https://api.openweathermap.org';

// ── Response-shape adapters ───────────────────────────────────────────

// OWM condition id ranges → our WeatherCondition
function owmIdToCondition(id: number): WeatherCondition {
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 300 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id === 701 || id === 721) return 'mist';
  if (id === 711 || id === 731 || id === 751 || id === 761) return 'haze';
  if (id === 741) return 'fog';
  if (id >= 700 && id < 800) return 'mist';
  if (id === 800) return 'clear';
  if (id > 800) return 'clouds';
  return 'clear';
}

interface OwmCurrentWeather {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  rain?: { '1h'?: number };
  weather: Array<{ id: number; description: string; icon: string }>;
}

interface OwmHourlyForecast {
  dt: number;
  temp: number;
  feels_like: number;
  wind_speed: number;
  pop: number;
  rain?: { '1h'?: number };
  weather: Array<{ id: number; icon: string }>;
}

interface OwmOneCallResponse {
  current: OwmCurrentWeather;
  hourly: OwmHourlyForecast[];
}

interface OwmAqiResponse {
  list: Array<{
    dt: number;
    main: { aqi: 1 | 2 | 3 | 4 | 5 };
    components: { pm2_5: number; pm10: number; no2: number; o3: number };
  }>;
}

// ── Provider ──────────────────────────────────────────────────────────

export class OpenWeatherMapProvider implements WeatherProvider {
  private readonly apiKey = process.env.OWM_KEY!;

  async current(coords: LatLng): Promise<CurrentWeather> {
    const url = new URL(`${OWM_BASE}/data/3.0/onecall`);
    url.searchParams.set('lat', String(coords.lat));
    url.searchParams.set('lon', String(coords.lng));
    url.searchParams.set('exclude', 'minutely,daily,alerts');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', this.apiKey);

    const res = await fetchWithRetry(url.toString());
    await assertOk(res);
    const data = (await res.json()) as OwmOneCallResponse;
    const c = data.current;
    const w = c.weather[0];

    return {
      coords,
      observedAt: new Date(c.dt * 1_000).toISOString(),
      tempC: c.temp,
      feelsLikeC: c.feels_like,
      humidity: c.humidity,
      windKph: c.wind_speed * 3.6,
      precipitationMm: c.rain?.['1h'] ?? 0,
      condition: owmIdToCondition(w.id),
      description: w.description,
      iconCode: w.icon,
    };
  }

  async hourly(coords: LatLng, hours: number): Promise<HourlyForecast[]> {
    const url = new URL(`${OWM_BASE}/data/3.0/onecall`);
    url.searchParams.set('lat', String(coords.lat));
    url.searchParams.set('lon', String(coords.lng));
    url.searchParams.set('exclude', 'minutely,daily,alerts,current');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', this.apiKey);

    const res = await fetchWithRetry(url.toString());
    await assertOk(res);
    const data = (await res.json()) as OwmOneCallResponse;

    return data.hourly.slice(0, hours).map((h) => {
      const w = h.weather[0];
      return {
        forecastFor: new Date(h.dt * 1_000).toISOString(),
        tempC: h.temp,
        feelsLikeC: h.feels_like,
        precipitationMm: h.rain?.['1h'] ?? 0,
        precipitationProbability: h.pop,
        windKph: h.wind_speed * 3.6,
        condition: owmIdToCondition(w.id),
        iconCode: w.icon,
      };
    });
  }

  async airQuality(coords: LatLng): Promise<AQIReading> {
    const url = new URL(`${OWM_BASE}/data/2.5/air_pollution`);
    url.searchParams.set('lat', String(coords.lat));
    url.searchParams.set('lon', String(coords.lng));
    url.searchParams.set('appid', this.apiKey);

    const res = await fetchWithRetry(url.toString());
    await assertOk(res);
    const data = (await res.json()) as OwmAqiResponse;
    const item = data.list[0];

    return {
      observedAt: new Date(item.dt * 1_000).toISOString(),
      aqi: item.main.aqi,
      pm2_5: item.components.pm2_5,
      pm10: item.components.pm10,
      no2: item.components.no2,
      o3: item.components.o3,
    };
  }
}
