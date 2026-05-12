/**
 * Railway API + Vercel static frontend — single source for URLs.
 *
 * Set VITE_API_URL (and optionally VITE_WS_URL) in Vercel per environment.
 * Local dev: Vite proxy → use relative /api, or set VITE_DEV_PROXY_TARGET in vite.config.
 *
 * Optional VITE_DEFAULT_API_URL: prod fallback when VITE_API_URL is missing (forks / local prod builds).
 */

/**
 * Built-in default API base if neither VITE_API_URL nor VITE_DEFAULT_API_URL is set in prod.
 * Override in Vercel with VITE_API_URL (preferred) or VITE_DEFAULT_API_URL for forks.
 */
export const PROD_DEFAULT_RAILWAY_API = 'https://arucase-production.up.railway.app/api';

function normalizeApiBase(v) {
  const s = (v || '').trim().replace(/\/$/, '');
  if (!s) return '';
  return s.endsWith('/api') ? s : `${s}/api`;
}

function getProdApiFallback() {
  const fromDefault = normalizeApiBase(import.meta.env.VITE_DEFAULT_API_URL);
  if (fromDefault) return fromDefault;
  return PROD_DEFAULT_RAILWAY_API;
}

/** Axios baseURL: dev uses Vite proxy; prod uses VITE_API_URL or fallback chain. */
export function getAxiosBaseURL() {
  if (import.meta.env.DEV) return '/api';
  const fromEnv = normalizeApiBase(import.meta.env.VITE_API_URL);
  if (fromEnv) return fromEnv;
  if (import.meta.env.PROD) {
    const fb = getProdApiFallback();
    console.warn(
      `[backendUrl] VITE_API_URL unset; using ${fb}. Set VITE_API_URL in Vercel (or VITE_DEFAULT_API_URL for a non-deploy default).`
    );
    return fb;
  }
  return '/api';
}

/** Origin only (no /api). Empty in dev — use relative /static paths via resolveStaticUrl. */
export function getBackendHttpOrigin() {
  if (import.meta.env.DEV) return '';
  const fromEnv = normalizeApiBase(import.meta.env.VITE_API_URL);
  const base = fromEnv || (import.meta.env.PROD ? getProdApiFallback() : '');
  if (!base) return '';
  return base.replace(/\/api\/?$/, '');
}

/**
 * Browser URL for a stored file path (uploads/…, static/…, bare filename) or absolute http(s).
 */
export function resolveStaticUrl(path) {
  if (path == null || path === '') return '';
  const s = String(path);
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.includes('cloudinary.com') || s.includes('res.cloudinary.com')) {
    const t = s.trim();
    if (t.startsWith('//')) return `https:${t}`;
    return `https://${t.replace(/^\/+/, '')}`;
  }
  let clean = s.startsWith('/') ? s.slice(1) : s;
  let rel;
  if (clean.startsWith('static/')) rel = `/${clean}`;
  else if (clean.startsWith('uploads/')) rel = `/static/${clean}`;
  else if (clean.includes('/')) rel = `/static/${clean}`;
  else rel = `/static/uploads/photos/${clean}`;

  if (import.meta.env.DEV) return rel;
  const origin = getBackendHttpOrigin();
  return origin ? `${origin}${rel}` : rel;
}

/**
 * Absolute URL for fetch() to API routes (path must start with / after /api).
 * Example: buildFetchUrl('/pre-form-one/2025/…/pdf') → /api/pre-form-one/… in dev.
 */
export function buildFetchUrl(pathAfterApiPrefix) {
  const p = pathAfterApiPrefix.startsWith('/') ? pathAfterApiPrefix : `/${pathAfterApiPrefix}`;
  if (import.meta.env.DEV) return `/api${p}`;
  const base = getAxiosBaseURL().replace(/\/$/, '');
  return `${base}${p}`;
}

/** Socket.IO server URL (no path). */
export function getWebSocketUrl() {
  const explicit = import.meta.env.VITE_WS_URL?.trim();
  if (explicit) return explicit;
  if (import.meta.env.DEV) {
    const api = import.meta.env.VITE_API_URL;
    if (api) {
      const origin = normalizeApiBase(api).replace(/\/api\/?$/, '');
      return origin.startsWith('https') ? `wss://${origin.slice(8)}` : `ws://${origin.slice(7)}`;
    }
    return 'ws://127.0.0.1:5000';
  }
  let origin = getBackendHttpOrigin();
  if (!origin && import.meta.env.PROD) {
    origin = getProdApiFallback().replace(/\/api\/?$/, '');
  }
  if (!origin) {
    if (import.meta.env.PROD) {
      console.warn('[backendUrl] Set VITE_API_URL or VITE_WS_URL for WebSocket.');
    }
    return import.meta.env.DEV ? 'ws://127.0.0.1:5000' : '';
  }
  return origin.startsWith('https') ? `wss://${origin.slice(8)}` : `ws://${origin.slice(7)}`;
}
