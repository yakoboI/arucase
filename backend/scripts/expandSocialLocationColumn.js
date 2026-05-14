/**
 * Widen website_settings.social_location so full Google Maps share URLs fit (was VARCHAR(255)).
 * Safe to run multiple times on PostgreSQL.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { query } = require('../config/database');

async function expandSocialLocationColumn() {
  try {
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'website_settings'
            AND column_name = 'social_location'
            AND data_type <> 'text'
        ) THEN
          ALTER TABLE website_settings
            ALTER COLUMN social_location TYPE TEXT USING social_location::text;
        END IF;
      END $$;
    `);
    console.log('✅ website_settings.social_location is TEXT (or already was).');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  }
}

expandSocialLocationColumn().then(() => process.exit());
