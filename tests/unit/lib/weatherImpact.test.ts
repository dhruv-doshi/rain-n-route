import { describe, it, expect } from 'vitest';
import { computeWeatherImpact } from '@/lib/weatherImpact';
import type { AQIReading, HourlyForecast } from '@/types';

function makeHour(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    forecastFor: new Date().toISOString(),
    tempC: 28,
    feelsLikeC: 30,
    precipitationMm: 0,
    precipitationProbability: 0.05,
    windKph: 10,
    condition: 'clouds',
    iconCode: '03d',
    ...overrides,
  };
}

function makeAQI(overrides: Partial<AQIReading> = {}): AQIReading {
  return {
    observedAt: new Date().toISOString(),
    aqi: 2,
    pm2_5: 12,
    pm10: 20,
    no2: 15,
    o3: 60,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 1: Empty forecast → everything low
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 1: empty forecast', () => {
  it('returns low overall with no factors or gear', () => {
    const result = computeWeatherImpact([]);
    expect(result.overall).toBe('low');
    expect(result.factors).toHaveLength(0);
    expect(result.gear).toHaveLength(0);
    expect(result.bufferMinutesRecommended).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 2: Dry, mild weather → low risk
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 2: dry mild weather', () => {
  it('produces low overall risk with no factors', () => {
    const hourly = [makeHour(), makeHour({ tempC: 29, feelsLikeC: 31 })];
    const result = computeWeatherImpact(hourly);
    expect(result.overall).toBe('low');
    expect(result.factors).toHaveLength(0);
    expect(result.gear).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 3: Light rain (1 mm, 30% chance) → moderate rain
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 3: light rain', () => {
  it('flags moderate rain and suggests umbrella', () => {
    const hourly = [
      makeHour({ precipitationMm: 1, precipitationProbability: 0.3, condition: 'rain' }),
    ];
    const result = computeWeatherImpact(hourly);
    expect(result.overall).toBe('moderate');
    const rain = result.factors.find((f) => f.kind === 'rain');
    expect(rain?.level).toBe('moderate');
    expect(result.gear.some((g) => g.id === 'umbrella')).toBe(true);
    expect(result.gear.some((g) => g.id === 'raincoat')).toBe(false);
    expect(result.bufferMinutesRecommended).toBe(5);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 4: Heavy rain (5 mm, 70% chance) → high rain + moderate flood
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 4: heavy rain with flood risk (primary verify scenario)', () => {
  it('surfaces flood factor, raincoat gear, and buffer', () => {
    const hourly = [
      makeHour({ precipitationMm: 5, precipitationProbability: 0.7, condition: 'rain' }),
    ];
    const result = computeWeatherImpact(hourly);
    expect(result.overall).toBe('high');

    const rain = result.factors.find((f) => f.kind === 'rain');
    expect(rain?.level).toBe('high');

    const flood = result.factors.find((f) => f.kind === 'flood');
    expect(flood).toBeDefined();
    expect(flood?.level).toBe('moderate');

    expect(result.gear.some((g) => g.id === 'raincoat')).toBe(true);
    expect(result.bufferMinutesRecommended).toBe(15);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 5: Very heavy rain (15 mm, 85% chance) → severe rain + high flood
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 5: very heavy rain', () => {
  it('flags severe rain and high flood', () => {
    const hourly = [
      makeHour({ precipitationMm: 15, precipitationProbability: 0.85, condition: 'rain' }),
    ];
    const result = computeWeatherImpact(hourly);
    expect(result.overall).toBe('severe');
    expect(result.factors.find((f) => f.kind === 'rain')?.level).toBe('severe');
    expect(result.factors.find((f) => f.kind === 'flood')?.level).toBe('high');
    expect(result.bufferMinutesRecommended).toBe(30);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 6: Extreme rain (25 mm, 90% chance) → severe flood
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 6: extreme flooding rain', () => {
  it('flags severe flood risk', () => {
    const hourly = [
      makeHour({ precipitationMm: 25, precipitationProbability: 0.9, condition: 'thunderstorm' }),
    ];
    const result = computeWeatherImpact(hourly);
    expect(result.factors.find((f) => f.kind === 'flood')?.level).toBe('severe');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 7: Moderate heat (feels like 36°C) → moderate heat + water
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 7: moderate heat', () => {
  it('flags moderate heat and suggests water', () => {
    const hourly = [makeHour({ feelsLikeC: 36 })];
    const result = computeWeatherImpact(hourly);
    expect(result.factors.find((f) => f.kind === 'heat')?.level).toBe('moderate');
    expect(result.gear.some((g) => g.id === 'water')).toBe(true);
    expect(result.gear.some((g) => g.id === 'sunscreen')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 8: Extreme heat (feels like 42°C) → high heat + water + sunscreen
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 8: extreme heat', () => {
  it('flags high heat and suggests water and sunscreen', () => {
    const hourly = [makeHour({ feelsLikeC: 42 })];
    const result = computeWeatherImpact(hourly);
    expect(result.factors.find((f) => f.kind === 'heat')?.level).toBe('high');
    expect(result.gear.some((g) => g.id === 'water')).toBe(true);
    expect(result.gear.some((g) => g.id === 'sunscreen')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 9: Poor AQI (level 4) → high AQI + mask
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 9: high AQI', () => {
  it('flags high AQI and suggests mask', () => {
    const hourly = [makeHour()];
    const aqi = makeAQI({ aqi: 4, pm2_5: 85 });
    const result = computeWeatherImpact(hourly, aqi);
    expect(result.factors.find((f) => f.kind === 'aqi')?.level).toBe('high');
    expect(result.gear.some((g) => g.id === 'mask')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 10: Very poor AQI (level 5) → severe AQI
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 10: severe AQI', () => {
  it('flags severe AQI', () => {
    const hourly = [makeHour()];
    const aqi = makeAQI({ aqi: 5, pm2_5: 200 });
    const result = computeWeatherImpact(hourly, aqi);
    expect(result.factors.find((f) => f.kind === 'aqi')?.level).toBe('severe');
    expect(result.overall).toBe('severe');
    expect(result.bufferMinutesRecommended).toBe(30);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 11: High wind (55 kph)
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 11: high wind', () => {
  it('flags high wind factor', () => {
    const hourly = [makeHour({ windKph: 55 })];
    const result = computeWeatherImpact(hourly);
    expect(result.factors.find((f) => f.kind === 'wind')?.level).toBe('high');
    expect(result.overall).toBe('high');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fixture 12: Combined rain + heat + poor AQI → severe overall
// ──────────────────────────────────────────────────────────────────────────────
describe('fixture 12: combined hazards', () => {
  it('resolves to severe overall when multiple high factors combine', () => {
    const hourly = [
      makeHour({
        precipitationMm: 15,
        precipitationProbability: 0.9,
        feelsLikeC: 42,
        windKph: 55,
        condition: 'thunderstorm',
      }),
    ];
    const aqi = makeAQI({ aqi: 5 });
    const result = computeWeatherImpact(hourly, aqi);
    expect(result.overall).toBe('severe');
    expect(result.factors.length).toBeGreaterThanOrEqual(3);
    expect(result.bufferMinutesRecommended).toBe(30);
    // Gear should include multiple items
    expect(result.gear.length).toBeGreaterThanOrEqual(2);
  });
});
