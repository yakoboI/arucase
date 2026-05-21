/**
 * Shared Puppeteer launch settings for local dev and Railway/Linux production.
 *
 * Ubuntu 24.04: /usr/bin/chromium-browser is often a snap stub ("snap install chromium").
 * Prefer Puppeteer's bundled Chrome; use system binaries only when verified real.
 */
const fs = require('fs');
const puppeteer = require('puppeteer');

const DEFAULT_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
];

const LINUX_CONTAINER_ARGS = ['--no-zygote', '--disable-software-rasterizer'];

/** System paths to try after bundled Chrome (snap stubs excluded by isUsableChromiumBinary) */
const SYSTEM_CHROMIUM_PATHS = [
  '/usr/lib/chromium/chromium',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];

function isSnapChromiumStub(filePath) {
  try {
    const head = fs.readFileSync(filePath, { encoding: 'utf8' }).slice(0, 800);
    return /requires the chromium snap|snap install chromium/i.test(head);
  } catch {
    return false;
  }
}

function isUsableChromiumBinary(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (isSnapChromiumStub(filePath)) {
      console.warn('[Puppeteer] Skipping snap wrapper:', filePath);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getBundledExecutablePath() {
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && isUsableChromiumBinary(bundled)) {
      return bundled;
    }
  } catch (e) {
    console.warn('[Puppeteer] Bundled Chrome not available:', e.message);
  }
  return null;
}

function collectExecutableCandidates() {
  const candidates = [];
  const seen = new Set();
  const add = (p) => {
    if (!p || seen.has(p) || !isUsableChromiumBinary(p)) return;
    seen.add(p);
    candidates.push(p);
  };

  // Bundled Chrome first (works on Railway when installed at build time)
  add(getBundledExecutablePath());

  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit) add(explicit);

  for (const p of SYSTEM_CHROMIUM_PATHS) add(p);

  return candidates;
}

/**
 * @param {{ timeout?: number, extraArgs?: string[] }} [options]
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function launchBrowser(options = {}) {
  const timeout = options.timeout ?? 120000;
  const candidates = collectExecutableCandidates();

  console.log('[Puppeteer] Launch candidates:', candidates.length ? candidates : ['(puppeteer default)']);

  const attempts = candidates.length > 0 ? candidates : [null];
  let lastError;

  for (const executablePath of attempts) {
    const useSystemChrome =
      executablePath &&
      (executablePath.startsWith('/usr/') || executablePath.includes('chrome-linux'));

    const args = [
      ...DEFAULT_ARGS,
      ...(useSystemChrome && executablePath.startsWith('/usr/') ? LINUX_CONTAINER_ARGS : []),
      ...(options.extraArgs || []),
    ];

    const launchOptions = {
      headless: true,
      args,
      timeout,
      ...(executablePath ? { executablePath } : {}),
    };

    try {
      const browser = await puppeteer.launch(launchOptions);
      console.log('[Puppeteer] Browser launched:', executablePath || 'default');
      return browser;
    } catch (err) {
      lastError = err;
      console.warn('[Puppeteer] Launch failed:', executablePath || 'default', err.message);
    }
  }

  const hint =
    'PDF generation requires Chrome. Ensure Puppeteer bundled Chrome is installed at build ' +
    '(npx puppeteer browsers install chrome). Do not set PUPPETEER_EXECUTABLE_PATH to ' +
    '/usr/bin/chromium-browser on Ubuntu 24.04 (snap stub).';
  const error = new Error(`${hint} (${lastError?.message || 'unknown'})`);
  error.cause = lastError;
  throw error;
}

function resolveExecutablePath() {
  return collectExecutableCandidates()[0] || null;
}

module.exports = { launchBrowser, DEFAULT_ARGS, resolveExecutablePath, isUsableChromiumBinary };
