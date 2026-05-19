/**
 * Post-build: load the main index CSS without blocking first paint.
 * Inline critical CSS lives in index.html; full styles apply via preload onload.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(__dirname, '../dist/index.html');

const INDEX_CSS_RE =
  /<link\s+rel="stylesheet"\s+crossorigin(?:="anonymous")?\s+href="(\/assets\/index-[^"]+\.css)"([^>]*)\s*\/?>/i;

if (!fs.existsSync(indexPath)) {
  console.warn('[defer-index-css] dist/index.html not found, skipping');
  process.exit(0);
}

let html = fs.readFileSync(indexPath, 'utf8');

const before = html;
html = html.replace(INDEX_CSS_RE, (_full, href, attrs) => {
  const trimmedAttrs = attrs.trim();
  return [
    `<link rel="preload" href="${href}" as="style"${trimmedAttrs ? ` ${trimmedAttrs}` : ''} onload="this.onload=null;this.rel='stylesheet'">`,
    `<noscript><link rel="stylesheet" crossorigin href="${href}"${trimmedAttrs ? ` ${trimmedAttrs}` : ''}></noscript>`,
  ].join('\n    ');
});

if (html === before) {
  console.warn('[defer-index-css] index stylesheet link not found, skipping');
  process.exit(0);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('[defer-index-css] Main stylesheet loads asynchronously');
