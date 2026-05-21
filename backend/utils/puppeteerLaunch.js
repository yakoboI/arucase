/**
 * Shared Puppeteer launch settings for local dev and Railway/Linux production.
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

/** Extra flags for Docker/Railway when using system Chromium */
const LINUX_CONTAINER_ARGS = ['--no-zygote', '--disable-software-rasterizer'];

const SYSTEM_CHROMIUM_PATHS = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
];

function resolveExecutablePath() {
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) {
      return bundled;
    }
  } catch {
    // bundled chromium not installed
  }
  for (const candidate of SYSTEM_CHROMIUM_PATHS) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * @param {{ timeout?: number, extraArgs?: string[] }} [options]
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function launchBrowser(options = {}) {
  const timeout = options.timeout ?? 120000;
  const executablePath = resolveExecutablePath();
  const useSystemChrome =
    executablePath &&
    SYSTEM_CHROMIUM_PATHS.some((p) => executablePath === p || executablePath.startsWith('/usr/bin/'));

  const args = [
    ...DEFAULT_ARGS,
    ...(useSystemChrome ? LINUX_CONTAINER_ARGS : []),
    ...(options.extraArgs || []),
  ];

  const launchOptions = {
    headless: true,
    args,
    timeout,
    ...(executablePath ? { executablePath } : {}),
  };

  console.log('[Puppeteer] Launching browser', {
    executablePath: executablePath || '(puppeteer default)',
    useSystemChrome,
  });

  const attempts = [];
  if (executablePath) attempts.push(executablePath);
  try {
    const bundled = puppeteer.executablePath();
    if (bundled && !attempts.includes(bundled)) attempts.push(bundled);
  } catch {
    /* ignore */
  }
  for (const p of SYSTEM_CHROMIUM_PATHS) {
    if (!attempts.includes(p) && fs.existsSync(p)) attempts.push(p);
  }
  if (attempts.length === 0) attempts.push(null);

  let lastError;
  for (const pathTry of attempts) {
    const opts = pathTry ? { ...launchOptions, executablePath: pathTry } : launchOptions;
    try {
      const browser = await puppeteer.launch(opts);
      console.log('[Puppeteer] Browser launched:', pathTry || 'default');
      return browser;
    } catch (err) {
      lastError = err;
      console.warn('[Puppeteer] Launch failed:', pathTry || 'default', err.message);
    }
  }

  const hint =
    'PDF generation requires Chromium. On Railway, install the chromium apt package ' +
    'or set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser';
  const error = new Error(`${hint} (${lastError?.message || 'unknown'})`);
  error.cause = lastError;
  throw error;
}

module.exports = { launchBrowser, DEFAULT_ARGS, resolveExecutablePath };
