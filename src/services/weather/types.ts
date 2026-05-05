import type { AQIReading, CurrentWeather, HourlyForecast, LatLng } from '@/types';

export interface WeatherProvider {
  current(coords: LatLng): Promise<CurrentWeather>;
  hourly(coords: LatLng, hours: number): Promise<HourlyForecast[]>;
  airQuality(coords: LatLng): Promise<AQIReading>;
}
