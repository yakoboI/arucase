/**
 * Migration Script: Add cloudinary_public_id column to administrators and staff_profiles tables
 * Run: node backend/scripts/add-cloudinary-public-id.js
 *
 * This script adds the missing cloudinary_public_id column so that administrator
 * photos can be properly tracked and displayed on both admin and public endpoints.
 *
 * Railway: Link the Postgres plugin to this service so DATABASE_URL is set. If this
 * script is not in your start command, server.js already adds these columns at boot
 * (ensureAdministratorsCloudinaryPublicIdColumn / ensureStaffProfilesCloudinaryPublicIdColumn).
 */
require('dotenv').config();
const { pool } = require('../config/database');

const RETRY_ATTEMPTS = parseInt(process.env.CLOUDINARY_MIGRATION_DB_RETRIES, 10) || 12;
const RETRY_DELAY_MS = parseInt(process.env.CLOUDINARY_MIGRATION_DB_RETRY_MS, 10) || 5000;

function assertDatabaseLikelyConfigured() {
  const url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  const host =
    process.env.PGHOST ||
    process.env.POSTGRES_HOST ||
    '';
  if (process.env.NODE_ENV === 'production' && !url && !host) {
    console.error('❌ DATABASE_URL (or PGHOST / POSTGRES_HOST) is not set.');
    console.error('   On Railway: open your backend service → Variables → add Postgres reference, or paste DATABASE_URL.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && !url && host === 'localhost') {
    console.error('❌ DATABASE_URL is missing and PGHOST is localhost; the container cannot reach your laptop.');
    console.error('   Set DATABASE_URL from your Railway Postgres service (Variables → reference).');
    process.exit(1);
  }
}

/**
 * Attempt to connect to the database, retrying on transient failures.
 * Returns the result of `SELECT NOW()` once a connection succeeds.
 * Throws after all attempts are exhausted.
 */
async function connectWithRetry() {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await pool.query('SELECT NOW() as current_time');
      return result;
    } catch (err) {
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(
          `⚠️  Database connection attempt ${attempt}/${RETRY_ATTEMPTS} failed: ${err.message}`
        );
        console.warn(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error(
          `❌ All ${RETRY_ATTEMPTS} connection attempts failed. Last error: ${err.message}`
        );
        throw err;
      }
    }
  }
}

async function addCloudinaryPublicId() {
  console.log('='.repeat(80));
  console.log('ADDING cloudinary_public_id COLUMN');
  console.log('='.repeat(80));
  console.log();

  try {
    assertDatabaseLikelyConfigured();
    const hasDbUrl = Boolean(process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim());
    console.log('📡 Database config:', hasDbUrl ? 'DATABASE_URL is set' : 'using discrete PG* env vars (no DATABASE_URL)');

    // Test database connection (with retry for transient timeouts)
    const connectionTest = await connectWithRetry();
    console.log(`✅ Database connected at: ${connectionTest.rows[0].current_time}`);
    console.log();

    // Add column to administrators table
    console.log('Adding cloudinary_public_id to administrators table...');
    await pool.query('ALTER TABLE administrators ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255)');
    console.log('✅ cloudinary_public_id added to administrators table');

    // Add column to staff_profiles table
    console.log('Adding cloudinary_public_id to staff_profiles table...');
    await pool.query('ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255)');
    console.log('✅ cloudinary_public_id added to staff_profiles table');

    console.log();
    console.log('='.repeat(80));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

addCloudinaryPublicId();
