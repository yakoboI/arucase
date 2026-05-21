/**
 * Shared Puppeteer launch settings for local dev and Railway/Linux production.
 */
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

/**
 * @param {{ timeout?: number, extraArgs?: string[] }} [options]
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function launchBrowser(options = {}) {
  const timeout = options.timeout ?? 120000;
  const args = [...DEFAULT_ARGS, ...(options.extraArgs || [])];

  const launchOptions = {
    headless: true,
    args,
    timeout,
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  try {
    return await puppeteer.launch(launchOptions);
  } catch (firstError) {
    // Bundled Chromium can fail on minimal Linux images; retry with system chromium if present.
    const fallbacks = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ].filter((p) => p !== launchOptions.executablePath);

    for (const executablePath of fallbacks) {
      try {
        const fs = require('fs');
        if (!fs.existsSync(executablePath)) continue;
        console.warn(`Puppeteer launch retry with ${executablePath}`);
        return await puppeteer.launch({ ...launchOptions, executablePath });
      } catch {
        // try next path
      }
    }

    const hint =
      'PDF generation requires Chromium. On Railway, ensure nixpacks installs Chromium libraries ' +
      'or set PUPPETEER_EXECUTABLE_PATH to a system chromium binary.';
    const err = new Error(`${hint} (${firstError.message})`);
    err.cause = firstError;
    throw err;
  }
}

module.exports = { launchBrowser, DEFAULT_ARGS };
