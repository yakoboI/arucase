/**
 * Migration Script: Add cloudinary_public_id column to administrators and staff_profiles tables
 * Run: node backend/scripts/add-cloudinary-public-id.js
 *
 * This script adds the missing cloudinary_public_id column so that administrator
 * photos can be properly tracked and displayed on both admin and public endpoints.
 */
require('dotenv').config();
const { pool } = require('../config/database');

async function addCloudinaryPublicId() {
  console.log('='.repeat(80));
  console.log('ADDING cloudinary_public_id COLUMN');
  console.log('='.repeat(80));
  console.log();

  try {
    // Test database connection
    const connectionTest = await pool.query('SELECT NOW() as current_time');
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
