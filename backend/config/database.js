/**
 * PostgreSQL Database Configuration and Connection Pool
 * Volume safeguards: statement timeout + max concurrent queries so extra load cannot collapse the DB.
 * Session safeguards: idle-in-transaction and lock timeouts reduce stuck connections and long lock waits.
 */
const { Pool } = require('pg');
require('dotenv').config();

// Statement timeout (ms) – no single query can run longer; prevents runaway queries from holding connections.
const STATEMENT_TIMEOUT_MS = Math.max(0, parseInt(process.env.STATEMENT_TIMEOUT_MS, 10) || 60000);

// End idle transactions (ms, 0 = disabled). Frees pool slots if a client forgets COMMIT.
const IDLE_IN_TRANSACTION_TIMEOUT_MS = (() => {
  const v = parseInt(process.env.IDLE_IN_TRANSACTION_TIMEOUT_MS, 10);
  if (Number.isFinite(v) && v >= 0) return v;
  return 120000;
})();

// Abort lock waits after this many ms (0 = disabled). Prevents one slow transaction from blocking others indefinitely.
const LOCK_TIMEOUT_MS = (() => {
  const v = parseInt(process.env.PG_LOCK_TIMEOUT_MS, 10);
  if (Number.isFinite(v) && v >= 0) return v;
  return 30000;
})();

// Max concurrent queries – when reached, new requests get 503 instead of queuing (keeps DB from collapsing).
// Set to 0 to disable (unlimited). Should be < pool max to leave headroom (e.g. 80 when pool is 100).
const MAX_CONCURRENT_QUERIES = Math.max(0, parseInt(process.env.DB_MAX_CONCURRENT_QUERIES, 10) || 0);
let activeQueries = 0;

class DatabaseOverloadError extends Error {
  constructor(message = 'Database at capacity; try again shortly') {
    super(message);
    this.name = 'DatabaseOverloadError';
    this.status = 503;
  }
}

// Pool size for high concurrency (200 users/sec: use POOL_MAX=100; ensure PostgreSQL max_connections >= pool size)
const poolMax = process.env.POOL_MAX ? Math.min(parseInt(process.env.POOL_MAX, 10) || 20, 200) : 100;
// Managed Postgres (Railway, etc.) can be slow to accept the first TCP connection; allow override.
const parsedConnTimeout = parseInt(process.env.PG_CONNECTION_TIMEOUT_MS, 10);
const connectionTimeoutMillis =
  Number.isFinite(parsedConnTimeout) && parsedConnTimeout > 0
    ? parsedConnTimeout
    : process.env.NODE_ENV === 'production'
      ? 30000
      : 5000;
const useSsl =
  process.env.NODE_ENV === 'production' ||
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_URL && /[?&]sslmode=require/i.test(process.env.DATABASE_URL));
const sslRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

const pool = new Pool({
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
  connectionString: process.env.DATABASE_URL,
  application_name: process.env.PG_APPLICATION_NAME || 'arucase-backend',
  ssl: useSsl ? { rejectUnauthorized: sslRejectUnauthorized } : false,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Per-connection session limits (set once per pooled client)
async function ensureSessionGuards(client) {
  if (client._sessionGuardsSet) return;
  if (STATEMENT_TIMEOUT_MS > 0) {
    await client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
  }
  if (IDLE_IN_TRANSACTION_TIMEOUT_MS > 0) {
    await client.query(`SET idle_in_transaction_session_timeout = ${IDLE_IN_TRANSACTION_TIMEOUT_MS}`);
  }
  if (LOCK_TIMEOUT_MS > 0) {
    await client.query(`SET lock_timeout = ${LOCK_TIMEOUT_MS}`);
  }
  client._sessionGuardsSet = true;
}

// Helper function to execute queries (with volume safeguards)
const query = async (text, params) => {
  if (MAX_CONCURRENT_QUERIES > 0 && activeQueries >= MAX_CONCURRENT_QUERIES) {
    throw new DatabaseOverloadError();
  }
  // Use Atomics-style increment via a closure to reduce (but not eliminate) the race window.
  // Node.js is single-threaded so ++ is effectively atomic between awaits; the real risk is
  // between the check above and the increment below, which is synchronous here.
  activeQueries += 1;
  const start = Date.now();
  let client;
  try {
    client = await pool.connect();
    await ensureSessionGuards(client);
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return res;
  } catch (error) {
    console.error('Database query error:', { message: error.message, code: error.code });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    activeQueries -= 1;
  }
};

// Helper function to get a client from the pool (caller must release it)
const getClient = async () => {
  const client = await pool.connect();
  await ensureSessionGuards(client);
  return client;
};

/**
 * Run multiple queries in a single transaction. Uses one client for BEGIN, fn(client), COMMIT/ROLLBACK.
 * Usage: await withTransaction(async (client) => { await client.query('INSERT...'); ... });
 */
const withTransaction = async (fn) => {
  if (MAX_CONCURRENT_QUERIES > 0 && activeQueries >= MAX_CONCURRENT_QUERIES) {
    throw new DatabaseOverloadError();
  }
  activeQueries += 1;
  const client = await pool.connect();
  try {
    await ensureSessionGuards(client);
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    console.error('Transaction error, rolling back:', { message: error.message, code: error.code });
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Rollback error:', rollbackError.message);
    });
    throw error;
  } finally {
    client.release();
    activeQueries -= 1;
  }
};

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  DatabaseOverloadError,
};

