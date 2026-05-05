import { MapmyIndiaProvider } from './maps/mapmyindia';
import { MockMapsProvider } from './maps/mock';
import type { MapsProvider } from './maps/types';
import { OpenWeatherMapProvider } from './weather/openweathermap';
import { MockWeatherProvider } from './weather/mock';
import type { WeatherProvider } from './weather/types';

function isMock(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_SERVICES === 'true' || process.env.NODE_ENV === 'test';
}

export function getMapsProvider(): MapsProvider {
  return isMock() ? new MockMapsProvider() : new MapmyIndiaProvider();
}

export function getWeatherProvider(): WeatherProvider {
  return isMock() ? new MockWeatherProvider() : new OpenWeatherMapProvider();
}

export type { MapsProvider, WeatherProvider };
