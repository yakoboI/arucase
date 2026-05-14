/**
 * Build a Google Maps *embed* iframe URL from a normal share / search Maps link.
 * Only returns https URLs on Google-controlled hosts.
 */
export function getGoogleMapsEmbedSrc(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const isGoogleHost =
    host === 'maps.google.com' ||
    host === 'www.google.com' ||
    host === 'google.com' ||
    host.endsWith('.google.com');

  if (!isGoogleHost) return null;

  const https = trimmed.replace(/^http:\/\//i, 'https://');

  if (url.pathname.includes('/maps/embed')) {
    return https;
  }

  const path = url.pathname + url.search;

  /* e.g. .../place/.../@-3.1558141,36.6991659,17z/data=... — use map zoom when present */
  const atInPath = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+)z)?/);
  if (atInPath) {
    const [, lat, lng, zoomStr] = atInPath;
    const z = zoomStr ? Math.min(21, Math.max(1, parseInt(zoomStr, 10) || 16)) : 16;
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&output=embed&z=${z}`;
  }

  const q =
    url.searchParams.get('q') ||
    url.searchParams.get('query') ||
    url.searchParams.get('daddr');
  if (q) {
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed&z=16`;
  }

  const ll = url.searchParams.get('ll');
  if (ll && /^-?\d/.test(ll)) {
    return `https://www.google.com/maps?q=${encodeURIComponent(ll)}&output=embed&z=16`;
  }

  const placeMatch = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch) {
    let segment = placeMatch[1];
    try {
      segment = decodeURIComponent(segment.replace(/\+/g, ' '));
    } catch {
      // keep encoded
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(segment)}&output=embed&z=16`;
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed&z=16`;
}
