import { isMockMode, getMapsConfig } from '@/lib/env';
import { GoogleMapsProvider } from './maps/google';
import { MockMapsProvider } from './maps/mock';
import type { MapsProvider } from './maps/types';
import { OpenWeatherMapProvider } from './weather/openweathermap';
import { MockWeatherProvider } from './weather/mock';
import type { WeatherProvider } from './weather/types';

export function getMapsProvider(): MapsProvider {
  if (isMockMode()) {
    return new MockMapsProvider();
  }
  const config = getMapsConfig();
  return new GoogleMapsProvider(config.serverKey);
}

export function getWeatherProvider(): WeatherProvider {
  return isMockMode() ? new MockWeatherProvider() : new OpenWeatherMapProvider();
}

export type { MapsProvider, WeatherProvider };
