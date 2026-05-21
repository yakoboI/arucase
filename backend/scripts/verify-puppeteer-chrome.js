#!/usr/bin/env node
/**
 * Fail the Railway/Nixpacks build if bundled Chrome is missing or has unresolved shared libs.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const puppeteer = require('puppeteer');

const chromePath = puppeteer.executablePath();
if (!chromePath || !fs.existsSync(chromePath)) {
  console.error('[verify-puppeteer-chrome] Chrome binary not found:', chromePath);
  process.exit(1);
}

console.log('[verify-puppeteer-chrome] Chrome:', chromePath);

try {
  const out = execSync(`ldd "${chromePath}"`, { encoding: 'utf8' });
  const missing = out.split('\n').filter((line) => /not found/i.test(line));
  if (missing.length) {
    console.error('[verify-puppeteer-chrome] Missing shared libraries:');
    missing.forEach((line) => console.error(' ', line.trim()));
    process.exit(1);
  }
  console.log('[verify-puppeteer-chrome] All shared libraries resolved.');
} catch (err) {
  console.error('[verify-puppeteer-chrome] ldd check failed:', err.message);
  process.exit(1);
}
