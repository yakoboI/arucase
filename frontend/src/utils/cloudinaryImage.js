/**
 * Cloudinary URL transforms for responsive delivery (PageSpeed / LCP).
 * Inserts transformation segment after /upload/ when not already present.
 */

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return t;
}

function isCloudinaryUrl(url) {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

/**
 * @param {string} url
 * @param {{ width?: number, height?: number, quality?: string, format?: string, crop?: string }} [opts]
 */
export function optimizeCloudinaryUrl(url, opts = {}) {
  const normalized = normalizeUrl(url);
  if (!normalized || !isCloudinaryUrl(normalized)) return normalized;

  const width = opts.width ?? 800;
  const quality = opts.quality ?? 'auto';
  const format = opts.format ?? 'auto';
  const crop = opts.crop ?? 'limit';
  const height = opts.height;

  const marker = '/upload/';
  const uploadIdx = normalized.indexOf(marker);
  if (uploadIdx === -1) return normalized;

  const head = normalized.slice(0, uploadIdx + marker.length);
  const tail = normalized.slice(uploadIdx + marker.length);

  const firstSegment = tail.split('/')[0] || '';
  if (firstSegment.includes(',') || /^(w_|h_|c_|q_|f_|g_|dpr_|ar_)/.test(firstSegment)) {
    return normalized;
  }

  const parts = [`w_${width}`, `q_${quality}`, `f_${format}`, `c_${crop}`];
  if (height) parts.splice(1, 0, `h_${height}`);
  return `${head}${parts.join(',')}/${tail}`;
}

/** Hero carousel — sized for ~960px max display (mobile LCP) */
export function heroImageUrl(url) {
  return optimizeCloudinaryUrl(url, { width: 960, crop: 'limit' });
}

/** Gallery grid thumbnails on homepage (~320×240 display) */
export function galleryThumbUrl(url) {
  return optimizeCloudinaryUrl(url, { width: 320, height: 240, crop: 'fill' });
}

/** Header logo / patron (~display ~120–160px) */
export function headerImageUrl(url) {
  return optimizeCloudinaryUrl(url, { width: 256, crop: 'limit' });
}
