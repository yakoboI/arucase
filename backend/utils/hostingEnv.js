/**
 * Railway (API) + Vercel (static SPA) + localhost — CORS and cookie rules.
 *
 * CORS:
 *   - Set ALLOWED_ORIGINS (comma-separated) on Railway to every browser origin that calls the API
 *     (e.g. https://your-app.vercel.app,https://preview-xxx.vercel.app).
 *   - Optional FRONTEND_URL (single origin) is merged into the allow list.
 *   - CORS_ALLOW_VERCEL_PREVIEWS=true allows any https://*.vercel.app Origin (preview deploys).
 *   - Non-production: localhost / 127.0.0.1 on common Vite ports are always allowed.
 *
 * Cookies (Vercel → Railway is cross-site):
 *   - Set COOKIE_CROSS_SITE=true on Railway when the SPA is on a different site than the API
 *     so auth cookies use SameSite=None; Secure (required for withCredentials from Vercel).
 *   - Local dev (localhost:3001 → localhost:5000) stays SameSite=Lax.
 */

const CLOUDINARY_ORIGINS = ['https://res.cloudinary.com', 'https://api.cloudinary.com'];

function parseCsv(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

function isTruthy(v) {
  const s = String(v || '').toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function defaultLocalOrigins() {
  const ports = [3000, 3001, 5173, 5174, 4173];
  const hosts = ['localhost', '127.0.0.1'];
  const out = [];
  for (const h of hosts) {
    for (const p of ports) {
      out.push(`http://${h}:${p}`);
    }
  }
  return out;
}

function isCookieCrossSite() {
  return isTruthy(process.env.COOKIE_CROSS_SITE) || isTruthy(process.env.CROSS_ORIGIN_COOKIES);
}

/**
 * Shape for Set-Cookie / clearCookie so browsers actually remove the cookie.
 */
function tlsSameSiteShape() {
  const cross = isCookieCrossSite();
  const prod = process.env.NODE_ENV === 'production';
  return {
    secure: prod || cross,
    sameSite: cross ? 'none' : 'lax',
  };
}

/**
 * @param {number} [maxAgeMs] — omit for clearCookie-only options (still pass path/httpOnly/secure/sameSite).
 */
function cookieShape(maxAgeMs) {
  const o = {
    httpOnly: true,
    path: '/',
    ...tlsSameSiteShape(),
  };
  if (maxAgeMs != null) o.maxAge = maxAgeMs;
  return o;
}

function buildStaticOriginList() {
  const isProd = process.env.NODE_ENV === 'production';
  const explicit = [...parseCsv(process.env.ALLOWED_ORIGINS), ...parseCsv(process.env.FRONTEND_URL)];
  const uniq = [...new Set(explicit.filter(Boolean))];
  let merged;
  if (!isProd) {
    merged = [...new Set([...uniq, ...defaultLocalOrigins(), ...CLOUDINARY_ORIGINS])];
    return merged;
  }
  merged = [...new Set([...uniq, ...CLOUDINARY_ORIGINS])];
  const nonCdn = merged.filter((o) => !CLOUDINARY_ORIGINS.includes(o));
  if (nonCdn.length === 0) {
    merged.unshift('https://arucase.vercel.app');
  }
  return merged;
}

/**
 * Express `cors` + Socket.IO `cors.origin` callback.
 */
function createCorsOriginValidator() {
  const staticList = buildStaticOriginList();
  const allowVercelPreview = isTruthy(process.env.CORS_ALLOW_VERCEL_PREVIEWS);
  const isProd = process.env.NODE_ENV === 'production';

  return function corsOrigin(origin, cb) {
    if (!origin) return cb(null, true);
    if (staticList.includes(origin)) return cb(null, true);
    if (allowVercelPreview) {
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) return cb(null, true);
      } catch (_) {
        /* ignore */
      }
    }
    if (!isProd) {
      try {
        const u = new URL(origin);
        if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
          return cb(null, true);
        }
      } catch (_) {
        /* ignore */
      }
    }
    console.warn('[cors] blocked Origin:', origin);
    return cb(null, false);
  };
}

module.exports = {
  isCookieCrossSite,
  cookieShape,
  createCorsOriginValidator,
  buildStaticOriginList,
  CLOUDINARY_ORIGINS,
};
