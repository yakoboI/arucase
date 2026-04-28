/**
 * PostgreSQL Database Configuration and Connection Pool
 * Volume safeguards: statement timeout + max concurrent queries so extra load cannot collapse the DB.
 */
const { Pool } = require('pg');
require('dotenv').config();

// Statement timeout (ms) – no single query can run longer; prevents runaway queries from holding connections.
const STATEMENT_TIMEOUT_MS = Math.max(0, parseInt(process.env.STATEMENT_TIMEOUT_MS, 10) || 60000);

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
const pool = new Pool({
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Force SSL to false for local PostgreSQL
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Ensure statement_timeout is set on this client (once per client)
async function ensureStatementTimeout(client) {
  if (client._statementTimeoutSet) return;
  if (STATEMENT_TIMEOUT_MS > 0) {
    await client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
  }
  client._statementTimeoutSet = true;
}

// Helper function to execute queries (with volume safeguards)
const query = async (text, params) => {
  if (MAX_CONCURRENT_QUERIES > 0 && activeQueries >= MAX_CONCURRENT_QUERIES) {
    throw new DatabaseOverloadError();
  }
  activeQueries += 1;
  const start = Date.now();
  let client;
  try {
    client = await pool.connect();
    await ensureStatementTimeout(client);
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (client) client.release();
    activeQueries -= 1;
  }
};

// Helper function to get a client from the pool (caller must release it)
const getClient = async () => {
  const client = await pool.connect();
  await ensureStatementTimeout(client);
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
    await ensureStatementTimeout(client);
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
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

