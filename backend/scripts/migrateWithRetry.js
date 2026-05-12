/**
 * Migrate MySQL to PostgreSQL with automatic retry on connection errors
 * Run: node backend/scripts/migrateWithRetry.js
 */

require('dotenv').config();

if (!process.env.MYSQL_PASSWORD) {
  console.error('Set MYSQL_PASSWORD in backend/.env for MySQL migration.');
  process.exit(1);
}

process.env.MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_USER = 'root';
process.env.MYSQL_DATABASE = 'arucase';

async function retryMigration(maxRetries = 10, delaySeconds = 60) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${maxRetries}...`);
    
    if (attempt > 1) {
      console.log(`⏳ Waiting ${delaySeconds} seconds for PostgreSQL connections to close...`);
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
    
    try {
      // Import and run migration
      const migration = require('./migrateMySQLtoPostgreSQL.js');
      // Migration script runs and exits, so if we get here it succeeded
      return;
    } catch (error) {
      if (error.message && error.message.includes('too many clients')) {
        console.log(`❌ Connection limit reached. Will retry...`);
        if (attempt === maxRetries) {
          console.log(`\n❌ Failed after ${maxRetries} attempts.`);
          console.log(`💡 Please wait longer or close PostgreSQL connections manually.`);
          process.exit(1);
        }
      } else {
        // Other error, don't retry
        throw error;
      }
    }
  }
}

// Override the exit in migration script to allow retries
const originalExit = process.exit;
process.exit = function(code) {
  if (code === 0) {
    originalExit(0);
  }
  // Don't exit on error, let retry handle it
};

retryMigration().catch(error => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});

