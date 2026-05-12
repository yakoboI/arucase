/**
 * Wait for PostgreSQL connections to close, then run migration
 * Run: node backend/scripts/waitAndMigrate.js
 */

console.log('⏳ Waiting 10 seconds for PostgreSQL connections to close...');
console.log('💡 If this persists, you may need to restart your PostgreSQL server or close other connections.\n');

setTimeout(async () => {
  const { spawn } = require('child_process');
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

  if (!process.env.MYSQL_PASSWORD) {
    console.error('Set MYSQL_PASSWORD in backend/.env for MySQL migration.');
    process.exit(1);
  }

  process.env.MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
  process.env.MYSQL_PORT = '3306';
  process.env.MYSQL_USER = 'root';
  process.env.MYSQL_DATABASE = 'arucase';
  
  const migration = spawn('node', ['scripts/migrateMySQLtoPostgreSQL.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  migration.on('close', (code) => {
    process.exit(code);
  });
}, 10000);

