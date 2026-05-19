/**
 * Post-build: modulepreload the homepage chunk so it downloads in parallel with the entry bundle.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');
const jsDir = path.join(distDir, 'js');

if (!fs.existsSync(indexPath) || !fs.existsSync(jsDir)) {
  console.warn('[inject-home-preload] dist output not found, skipping');
  process.exit(0);
}

const homeChunk = fs.readdirSync(jsDir).find((f) => /^HomePage-/.test(f) && f.endsWith('.js'));
if (!homeChunk) {
  console.warn('[inject-home-preload] HomePage chunk not found, skipping');
  process.exit(0);
}

const href = `/js/${homeChunk}`;
let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes(href)) {
  console.log('[inject-home-preload] Already present');
  process.exit(0);
}

const tag = `    <link rel="modulepreload" crossorigin href="${href}">`;
const marker = '<!-- HOME_MODULEPRELOAD -->';
if (html.includes(marker)) {
  html = html.replace(marker, tag);
} else {
  html = html.replace('</head>', `${tag}\n  </head>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`[inject-home-preload] Added modulepreload for ${homeChunk}`);
