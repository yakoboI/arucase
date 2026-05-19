/**
 * Post-build: set font-display:swap on Font Awesome @font-face rules in emitted CSS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.css')) files.push(p);
  }
  return files;
}

let patched = 0;
for (const file of walk(distDir)) {
  const css = fs.readFileSync(file, 'utf8');
  if (!css.includes('Font Awesome') && !css.includes('font-display')) continue;
  const next = css.replace(/font-display:\s*block/gi, 'font-display: swap');
  if (next !== css) {
    fs.writeFileSync(file, next, 'utf8');
    patched += 1;
  }
}

console.log(`[patch-fa-font-display] Updated ${patched} CSS file(s)`);
