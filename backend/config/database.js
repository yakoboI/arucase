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
  console.log('🔍 DATABASE DEBUG: Query initiated');
  console.log('🔍 DATABASE DEBUG: Query text:', text);
  console.log('🔍 DATABASE DEBUG: Query params:', params);
  console.log('🔍 DATABASE DEBUG: Active queries before:', activeQueries);
  console.log('🔍 DATABASE DEBUG: Max concurrent queries:', MAX_CONCURRENT_QUERIES);
  
  if (MAX_CONCURRENT_QUERIES > 0 && activeQueries >= MAX_CONCURRENT_QUERIES) {
    console.log('🔍 DATABASE DEBUG: Throwing DatabaseOverloadError');
    throw new DatabaseOverloadError();
  }
  activeQueries += 1;
  const start = Date.now();
  let client;
  try {
    console.log('🔍 DATABASE DEBUG: Getting client from pool...');
    client = await pool.connect();
    console.log('🔍 DATABASE DEBUG: Client connected, ensuring statement timeout...');
    await ensureStatementTimeout(client);
    console.log('🔍 DATABASE DEBUG: Executing query...');
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    console.log('🔍 DATABASE DEBUG: Query completed successfully');
    console.log('🔍 DATABASE DEBUG: Query duration:', duration + 'ms');
    console.log('🔍 DATABASE DEBUG: Query result rows:', res.rowCount);
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return res;
  } catch (error) {
    console.error('🔍 DATABASE DEBUG: Database query error:', error);
    console.error('🔍 DATABASE DEBUG: Error details:', {
      message: error.message,
      code: error.code,
      severity: error.severity,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint
    });
    throw error;
  } finally {
    if (client) {
      console.log('🔍 DATABASE DEBUG: Releasing client back to pool');
      client.release();
    }
    activeQueries -= 1;
    console.log('🔍 DATABASE DEBUG: Active queries after:', activeQueries);
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
  console.log('🔍 DATABASE DEBUG: Transaction initiated');
  console.log('🔍 DATABASE DEBUG: Active queries before:', activeQueries);
  
  if (MAX_CONCURRENT_QUERIES > 0 && activeQueries >= MAX_CONCURRENT_QUERIES) {
    console.log('🔍 DATABASE DEBUG: Throwing DatabaseOverloadError in transaction');
    throw new DatabaseOverloadError();
  }
  activeQueries += 1;
  const client = await pool.connect();
  console.log('🔍 DATABASE DEBUG: Transaction client connected');
  try {
    await ensureStatementTimeout(client);
    console.log('🔍 DATABASE DEBUG: Beginning transaction...');
    await client.query('BEGIN');
    console.log('🔍 DATABASE DEBUG: Transaction begun, executing function...');
    const result = await fn(client);
    console.log('🔍 DATABASE DEBUG: Function completed, committing transaction...');
    await client.query('COMMIT');
    console.log('🔍 DATABASE DEBUG: Transaction committed successfully');
    return result;
  } catch (error) {
    console.error('🔍 DATABASE DEBUG: Transaction error, rolling back:', error);
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('🔍 DATABASE DEBUG: Rollback error:', rollbackError);
    });
    throw error;
  } finally {
    console.log('🔍 DATABASE DEBUG: Releasing transaction client');
    client.release();
    activeQueries -= 1;
    console.log('🔍 DATABASE DEBUG: Active queries after transaction:', activeQueries);
  }
};

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  DatabaseOverloadError,
};

