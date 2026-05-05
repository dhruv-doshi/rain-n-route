import type {
  AQIReading,
  HourlyForecast,
  RiskFactor,
  RiskLevel,
  WeatherRiskSummary,
} from '@/types';
import { suggestGear } from './gearSuggestions';

const LEVEL_ORDER: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };

function maxLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>(
    (best, l) => (LEVEL_ORDER[l] > LEVEL_ORDER[best] ? l : best),
    'low',
  );
}

function rainRisk(maxMm: number): RiskLevel {
  if (maxMm >= 15) return 'severe';
  if (maxMm >= 5) return 'high';
  if (maxMm >= 1) return 'moderate';
  return 'low';
}

function floodRisk(maxMm: number, maxProb: number): RiskLevel {
  if (maxMm >= 20 && maxProb >= 0.8) return 'severe';
  if (maxMm >= 10 && maxProb >= 0.7) return 'high';
  if (maxMm >= 5 && maxProb >= 0.6) return 'moderate';
  return 'low';
}

function heatRisk(maxFeelsLikeC: number): RiskLevel {
  if (maxFeelsLikeC >= 45) return 'severe';
  if (maxFeelsLikeC >= 40) return 'high';
  if (maxFeelsLikeC >= 35) return 'moderate';
  return 'low';
}

function windRisk(maxKph: number): RiskLevel {
  if (maxKph >= 70) return 'severe';
  if (maxKph >= 50) return 'high';
  if (maxKph >= 30) return 'moderate';
  return 'low';
}

function aqiRisk(aqi: AQIReading['aqi']): RiskLevel {
  if (aqi >= 5) return 'severe';
  if (aqi >= 4) return 'high';
  if (aqi >= 3) return 'moderate';
  return 'low';
}

const BUFFER_MINUTES: Record<RiskLevel, number> = {
  low: 0,
  moderate: 5,
  high: 15,
  severe: 30,
};

/**
 * Computes a WeatherRiskSummary from a window of hourly forecasts and an optional AQI reading.
 * All inputs are treated as a flat window — worst-case values drive the risk calculation.
 */
export function computeWeatherImpact(
  hourly: HourlyForecast[],
  aqiReading?: AQIReading,
): WeatherRiskSummary {
  if (hourly.length === 0) {
    return { overall: 'low', factors: [], gear: [], bufferMinutesRecommended: 0 };
  }

  const maxMm = Math.max(...hourly.map((h) => h.precipitationMm));
  const maxProb = Math.max(...hourly.map((h) => h.precipitationProbability));
  const maxFeelsLike = Math.max(...hourly.map((h) => h.feelsLikeC));
  const maxWind = Math.max(...hourly.map((h) => h.windKph));

  const factors: RiskFactor[] = [];

  const rainLvl = rainRisk(maxMm);
  if (rainLvl !== 'low') {
    factors.push({
      kind: 'rain',
      level: rainLvl,
      reason: `Up to ${maxMm.toFixed(1)} mm of precipitation expected`,
    });
  }

  const floodLvl = floodRisk(maxMm, maxProb);
  if (floodLvl !== 'low') {
    factors.push({
      kind: 'flood',
      level: floodLvl,
      reason: `Heavy rainfall with ${Math.round(maxProb * 100)}% chance — possible waterlogging`,
    });
  }

  const heatLvl = heatRisk(maxFeelsLike);
  if (heatLvl !== 'low') {
    factors.push({
      kind: 'heat',
      level: heatLvl,
      reason: `Feels like ${maxFeelsLike.toFixed(0)}°C — heat conditions`,
    });
  }

  const windLvl = windRisk(maxWind);
  if (windLvl !== 'low') {
    factors.push({
      kind: 'wind',
      level: windLvl,
      reason: `Wind speeds up to ${maxWind.toFixed(0)} km/h`,
    });
  }

  if (aqiReading) {
    const aqiLvl = aqiRisk(aqiReading.aqi);
    if (aqiLvl !== 'low') {
      factors.push({
        kind: 'aqi',
        level: aqiLvl,
        reason: `AQI ${aqiReading.aqi}/5 — PM2.5: ${aqiReading.pm2_5} μg/m³`,
      });
    }
  }

  const overall = factors.length > 0 ? maxLevel(factors.map((f) => f.level)) : 'low';

  return {
    overall,
    factors,
    gear: suggestGear(factors),
    bufferMinutesRecommended: BUFFER_MINUTES[overall],
  };
}
