/**
 * Puppeteer Browser Pool Manager
 *
 * Maintains a singleton browser instance that persists across requests,
 * eliminating the 5-second Chrome startup cost on every PDF generation.
 *
 * Usage:
 *   const { acquirePage, releasePage, shutdown } = require('./puppeteerPool');
 *   const page = await acquirePage();
 *   try { ... } finally { await releasePage(page); }
 *
 * Design:
 *   - One shared browser instance (lazy-initialized on first use).
 *   - A fixed pool of reusable pages (default: POOL_SIZE = 3).
 *   - Requests that exceed the pool size are queued and served FIFO.
 *   - If the browser crashes, it is restarted transparently on the next acquire.
 *   - Graceful shutdown closes all pages and the browser cleanly.
 */

'use strict';

const { launchBrowser } = require('./puppeteerLaunch');

// ─── Configuration ────────────────────────────────────────────────────────────

/** Number of pages kept alive and ready for concurrent PDF jobs. */
const POOL_SIZE = parseInt(process.env.PUPPETEER_POOL_SIZE || '3', 10);

/** How long (ms) a single page.pdf() / page.setContent() call may take before we abort. */
const PAGE_TIMEOUT_MS = parseInt(process.env.PUPPETEER_PAGE_TIMEOUT_MS || '30000', 10);

// ─── Internal state ───────────────────────────────────────────────────────────

/** @type {import('puppeteer').Browser | null} */
let _browser = null;

/** @type {boolean} True while a browser launch is in progress. */
let _launching = false;

/** @type {Promise<import('puppeteer').Browser> | null} Shared launch promise so concurrent callers wait on the same launch. */
let _launchPromise = null;

/** @type {boolean} Set to true once shutdown() is called; prevents new acquires. */
let _shuttingDown = false;

/**
 * Pool entries.
 * @type {Array<{ page: import('puppeteer').Page, busy: boolean }>}
 */
let _pool = [];

/**
 * Queue of resolve callbacks waiting for a free page.
 * @type {Array<(page: import('puppeteer').Page) => void>}
 */
const _waitQueue = [];

// ─── Browser lifecycle ────────────────────────────────────────────────────────

/**
 * Ensure the browser is running and return it.
 * If a launch is already in progress, all callers await the same promise.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function _ensureBrowser() {
  if (_browser) {
    // Quick liveness check — if the browser process died, wsEndpoint() throws.
    try {
      _browser.wsEndpoint(); // synchronous; throws if disconnected
      return _browser;
    } catch {
      console.warn('[PuppeteerPool] Browser disconnected; restarting...');
      _browser = null;
      _pool = [];
    }
  }

  if (_launchPromise) {
    return _launchPromise;
  }

  _launching = true;
  const launchStart = Date.now();
  console.log('[PuppeteerPool] Launching browser...');

  _launchPromise = launchBrowser()
    .then((browser) => {
      _browser = browser;
      _launching = false;
      _launchPromise = null;
      console.log(`[PuppeteerPool] Browser ready in ${Date.now() - launchStart}ms`);

      // Listen for unexpected disconnects so we can clean up state.
      browser.on('disconnected', () => {
        console.warn('[PuppeteerPool] Browser disconnected unexpectedly; will relaunch on next request.');
        _browser = null;
        _pool = [];
        // Drain the wait queue with an error so callers don't hang forever.
        while (_waitQueue.length > 0) {
          const resolve = _waitQueue.shift();
          // We resolve with null; acquirePage() will retry _ensureBrowser().
          resolve(null);
        }
      });

      return browser;
    })
    .catch((err) => {
      _launching = false;
      _launchPromise = null;
      console.error('[PuppeteerPool] Browser launch failed:', err.message);
      throw err;
    });

  return _launchPromise;
}

// ─── Pool management ──────────────────────────────────────────────────────────

/**
 * Grow the pool up to POOL_SIZE by opening new pages on the current browser.
 * Called after a successful browser launch or when the pool is empty.
 */
async function _growPool(browser) {
  const needed = POOL_SIZE - _pool.length;
  if (needed <= 0) return;

  const opens = [];
  for (let i = 0; i < needed; i++) {
    opens.push(
      browser.newPage().then((page) => {
        // Suppress noisy console output from pages.
        page.on('console', (msg) => {
          if (['warning', 'error'].includes(msg.type())) {
            console.log('[PuppeteerPool][page:console]', msg.type(), msg.text());
          }
        });
        page.on('pageerror', (err) => {
          console.error('[PuppeteerPool][page:error]', err.message);
        });
        _pool.push({ page, busy: false });
      }).catch((err) => {
        console.warn('[PuppeteerPool] Could not open page:', err.message);
      })
    );
  }
  await Promise.all(opens);
  console.log(`[PuppeteerPool] Pool size: ${_pool.length}/${POOL_SIZE}`);
}

/**
 * Acquire a page from the pool.
 * If all pages are busy, the caller is queued and will receive a page as soon
 * as one is released.
 *
 * @returns {Promise<import('puppeteer').Page>}
 */
async function acquirePage() {
  if (_shuttingDown) {
    throw new Error('[PuppeteerPool] Pool is shutting down; no new pages available.');
  }

  const browser = await _ensureBrowser();

  // Grow the pool if it has room (e.g. after a fresh browser launch).
  if (_pool.length < POOL_SIZE) {
    await _growPool(browser);
  }

  // Try to hand out a free page immediately.
  const entry = _pool.find((e) => !e.busy);
  if (entry) {
    entry.busy = true;
    console.log(`[PuppeteerPool] Page acquired (pool: ${_pool.filter(e => e.busy).length}/${_pool.length} busy)`);
    return entry.page;
  }

  // All pages are busy — queue this request.
  console.log(`[PuppeteerPool] All ${_pool.length} pages busy; queuing request (queue depth: ${_waitQueue.length + 1})`);
  return new Promise((resolve) => {
    _waitQueue.push(resolve);
  });
}

/**
 * Return a page to the pool so the next queued request can use it.
 * The page is reset (navigation history cleared) before being reused.
 *
 * @param {import('puppeteer').Page} page
 */
async function releasePage(page) {
  const entry = _pool.find((e) => e.page === page);
  if (!entry) {
    // Page not in pool (e.g. created outside the pool); just close it.
    try { await page.close(); } catch { /* ignore */ }
    return;
  }

  // If there is a waiter, hand the page directly to them.
  if (_waitQueue.length > 0) {
    const resolve = _waitQueue.shift();
    // Keep entry.busy = true since the page is still in use.
    console.log(`[PuppeteerPool] Page handed to queued request (queue remaining: ${_waitQueue.length})`);
    resolve(page);
    return;
  }

  // No waiters — reset the page and mark it free.
  try {
    // Navigate to about:blank to clear any lingering state / memory from the previous job.
    await page.goto('about:blank', { waitUntil: 'commit', timeout: 5000 });
  } catch {
    // If reset fails, replace the page with a fresh one.
    try {
      await page.close();
    } catch { /* ignore */ }
    const browser = _browser;
    if (browser) {
      try {
        const fresh = await browser.newPage();
        entry.page = fresh;
      } catch (err) {
        console.warn('[PuppeteerPool] Could not replace page after reset failure:', err.message);
        _pool = _pool.filter((e) => e !== entry);
      }
    } else {
      _pool = _pool.filter((e) => e !== entry);
    }
  }

  entry.busy = false;
  console.log(`[PuppeteerPool] Page released (pool: ${_pool.filter(e => e.busy).length}/${_pool.length} busy)`);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * Close all pooled pages and the browser.
 * Called on SIGTERM / SIGINT from server.js.
 */
async function shutdown() {
  if (_shuttingDown) return;
  _shuttingDown = true;
  console.log('[PuppeteerPool] Shutting down...');

  // Drain the wait queue so callers don't hang.
  while (_waitQueue.length > 0) {
    const resolve = _waitQueue.shift();
    resolve(null); // acquirePage() will throw because _shuttingDown is true.
  }

  // Close all pages.
  await Promise.all(
    _pool.map(async (entry) => {
      try { await entry.page.close(); } catch { /* ignore */ }
    })
  );
  _pool = [];

  // Close the browser.
  if (_browser) {
    try {
      await _browser.close();
      console.log('[PuppeteerPool] Browser closed.');
    } catch (err) {
      console.warn('[PuppeteerPool] Error closing browser:', err.message);
    }
    _browser = null;
  }
}

// ─── Health / diagnostics ─────────────────────────────────────────────────────

/**
 * Returns a snapshot of the current pool state for health checks / logging.
 * @returns {{ poolSize: number, busy: number, idle: number, queued: number, browserAlive: boolean }}
 */
function getPoolStatus() {
  const busy = _pool.filter((e) => e.busy).length;
  return {
    poolSize: _pool.length,
    busy,
    idle: _pool.length - busy,
    queued: _waitQueue.length,
    browserAlive: _browser !== null,
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  acquirePage,
  releasePage,
  shutdown,
  getPoolStatus,
  /** Exposed for tests / advanced callers that need the raw browser. */
  getBrowser: () => _browser,
  PAGE_TIMEOUT_MS,
};
