import { describe, it, expect } from 'vitest';
import { encodeShareToken, decodeShareToken, type SharePayload } from '@/services/share';

const PAYLOAD: SharePayload = {
  from: { lat: 12.9915, lng: 77.5707 },
  to: { lat: 12.9755, lng: 77.6068 },
  fromLabel: 'Mantri Square',
  toLabel: 'MG Road Metro',
  selectedRouteId: 'route-1',
};

describe('share token round-trip', () => {
  it('round-trips a payload exactly', () => {
    const token = encodeShareToken(PAYLOAD);
    const decoded = decodeShareToken(token);
    expect(decoded).toEqual(PAYLOAD);
  });

  it('produces a URL-safe token (no +, /, or =)', () => {
    // Long labels increase chance of base64 characters that need URL-encoding
    const long: SharePayload = { ...PAYLOAD, fromLabel: 'a'.repeat(200), toLabel: 'b'.repeat(200) };
    const token = encodeShareToken(long);
    expect(token).not.toMatch(/[+/=]/);
  });

  it('omits selectedRouteId cleanly when not provided', () => {
    const { ...rest } = PAYLOAD;
    delete (rest as Partial<SharePayload>).selectedRouteId;
    const token = encodeShareToken(rest);
    const decoded = decodeShareToken(token);
    expect(decoded?.selectedRouteId).toBeUndefined();
  });

  it('returns null for malformed tokens', () => {
    expect(decodeShareToken('not-base64!@#$')).toBeNull();
    expect(decodeShareToken('')).toBeNull();
  });

  it('returns null when version mismatches', () => {
    // Manually craft a v0 token
    const wire = JSON.stringify({ v: 0, ...PAYLOAD });
    const b64 = Buffer.from(wire)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeShareToken(b64)).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    const wire = JSON.stringify({ v: 1, from: { lat: 1, lng: 2 } });
    const b64 = Buffer.from(wire)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeShareToken(b64)).toBeNull();
  });
});
