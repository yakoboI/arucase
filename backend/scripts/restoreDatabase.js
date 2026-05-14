/**
 * PostgreSQL restore from a custom-format dump (from backupDatabase.js).
 *
 * Usage: node backend/scripts/restoreDatabase.js [--no-clean] <path-to-dump>
 *
 * Example: node backend/scripts/restoreDatabase.js backend/backups/arucase_2025-02-18_11-30.dump
 *
 * Default uses pg_restore --clean --if-exists (drops objects before recreate). Pass --no-clean to load
 * into a non-empty database without dropping (may still hit constraint conflicts).
 *
 * Requires: pg_restore on PATH. Connection from DATABASE_URL or PG* / POSTGRES_* (see backend/.env.example).
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const repoRoot = path.join(backendRoot, '..');

require('dotenv').config({ path: path.join(repoRoot, '.env') });
require('dotenv').config({ path: path.join(backendRoot, '.env') });

const argv = process.argv.slice(2);
const noClean = argv.includes('--no-clean');
const positional = argv.filter((a) => a !== '--no-clean');
const dumpArg = positional[0];

if (!dumpArg) {
  console.error('Usage: node backend/scripts/restoreDatabase.js [--no-clean] <path-to-dump>');
  console.error('Example: node backend/scripts/restoreDatabase.js backend/backups/arucase_2025-02-18_11-30.dump');
  process.exit(1);
}

const resolved = path.isAbsolute(dumpArg) ? dumpArg : path.resolve(process.cwd(), dumpArg);
if (!fs.existsSync(resolved)) {
  console.error('File not found:', resolved);
  process.exit(1);
}

const env = { ...process.env };
const args = [];
if (!noClean) {
  args.push('--clean', '--if-exists');
}
const jobs = parseInt(process.env.PG_RESTORE_JOBS, 10);
if (Number.isFinite(jobs) && jobs > 1) {
  args.push('--jobs', String(Math.min(jobs, 8)));
}
args.push('-d');
if (env.DATABASE_URL) {
  args.push(env.DATABASE_URL);
} else {
  const db = env.PGDATABASE || env.POSTGRES_DB || 'railway';
  args.push(db);
}
args.push(resolved);

function runRestore() {
  return new Promise((resolve, reject) => {
    const child = spawn('pg_restore', args, {
      env,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_restore exited with code ${code}`));
    });
  });
}

runRestore()
  .then(() => {
    console.log('✅ Restore completed.');
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
