import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { OpenWeatherMapProvider } from '@/services/weather/openweathermap';
import { ServiceError } from '@/lib/http';
import { weatherHandlers, errorHandlers } from './mswHandlers';

process.env.OWM_KEY = 'test-owm-key';

const server = setupServer(...weatherHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BENGALURU = { lat: 12.9716, lng: 77.5946 };

describe('OpenWeatherMapProvider', () => {
  const provider = new OpenWeatherMapProvider();

  describe('current', () => {
    it('returns CurrentWeather with correct shape', async () => {
      const weather = await provider.current(BENGALURU);
      expect(weather.coords).toEqual(BENGALURU);
      expect(weather.tempC).toBe(28.4);
      expect(weather.humidity).toBe(65);
      expect(weather.condition).toBe('clouds');
      expect(weather.iconCode).toBe('04d');
    });

    it('converts wind from m/s to kph', async () => {
      const weather = await provider.current(BENGALURU);
      // fixture wind_speed = 3.2 m/s → 11.52 kph
      expect(weather.windKph).toBeCloseTo(11.52, 1);
    });

    it('maps OWM weather id 803 to clouds condition', async () => {
      const weather = await provider.current(BENGALURU);
      expect(weather.condition).toBe('clouds');
    });
  });

  describe('hourly', () => {
    it('returns HourlyForecast array trimmed to requested hours', async () => {
      const forecasts = await provider.hourly(BENGALURU, 2);
      expect(forecasts).toHaveLength(2);
    });

    it('maps rain condition (id 501) correctly', async () => {
      const forecasts = await provider.hourly(BENGALURU, 3);
      expect(forecasts[1].condition).toBe('rain');
      expect(forecasts[1].precipitationMm).toBe(3.2);
      expect(forecasts[1].precipitationProbability).toBe(0.6);
    });

    it('maps heavy rain (id 502) correctly', async () => {
      const forecasts = await provider.hourly(BENGALURU, 3);
      expect(forecasts[2].condition).toBe('rain');
      expect(forecasts[2].precipitationMm).toBe(8.5);
    });
  });

  describe('airQuality', () => {
    it('returns AQIReading with correct shape', async () => {
      const aqi = await provider.airQuality(BENGALURU);
      expect(aqi.aqi).toBe(3);
      expect(aqi.pm2_5).toBeCloseTo(35.45, 1);
      expect(aqi.pm10).toBeCloseTo(48.92, 1);
      expect(aqi.no2).toBeCloseTo(40.12, 1);
    });
  });

  describe('error handling', () => {
    it('throws ServiceError on 504', async () => {
      server.use(errorHandlers.owmOnecall504);
      await expect(provider.current(BENGALURU)).rejects.toSatisfy(
        (e: unknown) => e instanceof ServiceError && e.code === 'PROVIDER_ERROR',
      );
    });
  });
});
