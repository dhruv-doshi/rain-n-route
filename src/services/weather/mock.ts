import type { AQIReading, CurrentWeather, HourlyForecast, LatLng } from '@/types';
import type { WeatherProvider } from './types';

export const MOCK_CURRENT_WEATHER: CurrentWeather = {
  coords: { lat: 12.9716, lng: 77.5946 },
  observedAt: new Date().toISOString(),
  tempC: 28,
  feelsLikeC: 31,
  humidity: 65,
  windKph: 12,
  precipitationMm: 0,
  condition: 'clouds',
  description: 'scattered clouds',
  iconCode: '03d',
};

export const MOCK_HEAVY_RAIN_WEATHER: CurrentWeather = {
  ...MOCK_CURRENT_WEATHER,
  tempC: 24,
  feelsLikeC: 24,
  precipitationMm: 12,
  condition: 'rain',
  description: 'heavy intensity rain',
  iconCode: '10d',
};

export const MOCK_HOURLY_FORECAST: HourlyForecast[] = Array.from({ length: 48 }, (_, i) => ({
  forecastFor: new Date(Date.now() + i * 3_600_000).toISOString(),
  tempC: 26 + Math.sin(i / 6) * 4,
  feelsLikeC: 28 + Math.sin(i / 6) * 4,
  precipitationMm: i % 8 === 3 ? 5 : 0,
  precipitationProbability: i % 8 === 3 ? 0.7 : 0.1,
  windKph: 10,
  condition: i % 8 === 3 ? 'rain' : 'clouds',
  iconCode: i % 8 === 3 ? '10d' : '03d',
}));

export const MOCK_AQI_READING: AQIReading = {
  observedAt: new Date().toISOString(),
  aqi: 3,
  pm2_5: 35,
  pm10: 58,
  no2: 40,
  o3: 80,
};

export class MockWeatherProvider implements WeatherProvider {
  constructor(private readonly overrides: { rain?: boolean } = {}) {}

  async current(_coords: LatLng): Promise<CurrentWeather> {
    return this.overrides.rain ? MOCK_HEAVY_RAIN_WEATHER : MOCK_CURRENT_WEATHER;
  }

  async hourly(_coords: LatLng, hours: number): Promise<HourlyForecast[]> {
    return MOCK_HOURLY_FORECAST.slice(0, hours);
  }

  async airQuality(_coords: LatLng): Promise<AQIReading> {
    return MOCK_AQI_READING;
  }
}

export const mockWeatherProvider = new MockWeatherProvider();
