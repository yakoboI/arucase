/**
 * Post-build SRI injection for index.html.
 * Must run last (after patch-fa-font-display.mjs) so integrity hashes match final file bytes.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

function hashFile(urlPath) {
  const filePath = path.join(distDir, urlPath.replace(/^\//, '').split('?')[0]);
  if (!fs.existsSync(filePath)) return null;
  const digest = crypto.createHash('sha384').update(fs.readFileSync(filePath)).digest('base64');
  return `sha384-${digest}`;
}

function withIntegrity(tag, urlPath) {
  if (tag.includes('integrity=')) return tag;
  const integrity = hashFile(urlPath);
  if (!integrity) return tag;
  let next = tag;
  if (!/\bcrossorigin\b/i.test(next)) {
    next = next.replace(/\s*\/?>$/, ' crossorigin="anonymous"$&');
  }
  return next.replace(/\s*\/?>$/, ` integrity="${integrity}"$&`);
}

if (!fs.existsSync(indexPath)) {
  console.warn('[inject-sri] dist/index.html not found, skipping');
  process.exit(0);
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(
  /<script\b[^>]*\bsrc="(\/[^"]+)"[^>]*>/gi,
  (tag, src) => withIntegrity(tag, src)
);
html = html.replace(
  /<link\b[^>]*\bhref="(\/[^"]+)"[^>]*>/gi,
  (tag, href) => {
    if (!/\brel=["'](?:stylesheet|modulepreload)["']/i.test(tag)) return tag;
    return withIntegrity(tag, href);
  }
);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('[inject-sri] Updated integrity attributes in dist/index.html');
