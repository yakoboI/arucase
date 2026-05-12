/**
 * Helpers for one-off Node scripts: never hardcode DB passwords in source.
 * Prefer DATABASE_URL (or LOCAL_DATABASE_URL / RAILWAY_DATABASE_URL for transfer scripts).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

function requireConn(label, ...envNames) {
  for (const name of envNames) {
    const v = process.env[name];
    if (v && String(v).trim()) return String(v).trim();
  }
  throw new Error(
    `${label}: set one of ${envNames.join(', ')} to a PostgreSQL connection string (e.g. postgres://user:pass@host:port/db).`
  );
}

function poolFromEnv(...envNames) {
  const connectionString = requireConn('Database', ...envNames);
  return new Pool({ connectionString });
}

module.exports = { Pool, poolFromEnv, requireConn };
