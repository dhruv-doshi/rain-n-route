import { describe, it, expect } from 'vitest';
import { formatDuration, formatCost, formatDistance } from '@/lib/format';

describe('formatDuration', () => {
  it('formats under 60 min', () => expect(formatDuration(2700)).toBe('45 min'));
  it('formats exactly 60 min as 1 h', () => expect(formatDuration(3600)).toBe('1 h'));
  it('formats hours and minutes', () => expect(formatDuration(4320)).toBe('1 h 12 min'));
  it('formats 1 min', () => expect(formatDuration(60)).toBe('1 min'));
  it('rounds to nearest minute', () => expect(formatDuration(90)).toBe('2 min'));
});

describe('formatCost', () => {
  it('returns Free for zero', () => expect(formatCost(0)).toBe('Free'));
  it('formats whole rupees', () => expect(formatCost(4500)).toBe('₹45'));
  it('formats rupees with paise', () => expect(formatCost(4550)).toBe('₹45.50'));
  it('formats single rupee', () => expect(formatCost(100)).toBe('₹1'));
});

describe('formatDistance', () => {
  it('formats meters under 1 km', () => expect(formatDistance(800)).toBe('800 m'));
  it('formats exactly 1 km', () => expect(formatDistance(1000)).toBe('1.0 km'));
  it('formats km with decimal', () => expect(formatDistance(12500)).toBe('12.5 km'));
  it('rounds meters', () => expect(formatDistance(450)).toBe('450 m'));
});
