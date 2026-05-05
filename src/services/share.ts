import type { LatLng } from '@/types';

export interface SharePayload {
  from: LatLng;
  to: LatLng;
  fromLabel: string;
  toLabel: string;
  selectedRouteId?: string;
}

const VERSION = 1;

/** Base64-URL-safe encoding (RFC 4648 §5) — no padding, `+/` swapped to `-_`. */
function toBase64Url(input: string): string {
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(input, 'utf-8').toString('base64')
      : btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return typeof Buffer !== 'undefined'
    ? Buffer.from(padded, 'base64').toString('utf-8')
    : decodeURIComponent(escape(atob(padded)));
}

/** Encode a SharePayload into a URL-safe token. Throws nothing — caller validates. */
export function encodeShareToken(payload: SharePayload): string {
  const wire = { v: VERSION, ...payload };
  return toBase64Url(JSON.stringify(wire));
}

/** Decode a token back to a SharePayload, or null if malformed / wrong version. */
export function decodeShareToken(token: string): SharePayload | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const obj = JSON.parse(fromBase64Url(token)) as { v?: number } & Partial<SharePayload>;
    if (obj.v !== VERSION) return null;
    if (
      !obj.from ||
      !obj.to ||
      typeof obj.fromLabel !== 'string' ||
      typeof obj.toLabel !== 'string'
    )
      return null;
    if (typeof obj.from.lat !== 'number' || typeof obj.from.lng !== 'number') return null;
    if (typeof obj.to.lat !== 'number' || typeof obj.to.lng !== 'number') return null;
    return {
      from: obj.from,
      to: obj.to,
      fromLabel: obj.fromLabel,
      toLabel: obj.toLabel,
      selectedRouteId: obj.selectedRouteId,
    };
  } catch {
    return null;
  }
}
