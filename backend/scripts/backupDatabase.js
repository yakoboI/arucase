/**
 * PostgreSQL backup using pg_dump.
 * Run from repo root or backend: node backend/scripts/backupDatabase.js
 *
 * Requires: pg_dump on PATH (PostgreSQL client tools).
 * Env: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE or DATABASE_URL (see backend/.env.example).
 *
 * Output: backend/backups/arucase_YYYY-MM-DD_HH-mm.dump (custom format, -Fc).
 *
 * Optional: BACKUP_VERIFY=1 (default) runs pg_restore -l on the new file.
 * BACKUP_RETENTION_DAYS (default 14): delete dumps older than this many days (0 = skip).
 * BACKUP_MAX_FILES (default 40): keep at most this many newest dumps after backup (0 = skip).
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const repoRoot = path.join(backendRoot, '..');

require('dotenv').config({ path: path.join(repoRoot, '.env') });
require('dotenv').config({ path: path.join(backendRoot, '.env') });

const backupsDir = path.join(backendRoot, 'backups');

function runCmd(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    let stderr = '';
    let stdout = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
    });
  });
}

async function verifyDump(dumpPath) {
  await runCmd('pg_restore', ['-l', dumpPath], process.env);
}

function pruneBackups(dir) {
  const retentionDays = Math.max(0, parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 14);
  const maxFiles = Math.max(0, parseInt(process.env.BACKUP_MAX_FILES, 10) || 40);
  const now = Date.now();
  const maxAgeMs = retentionDays > 0 ? retentionDays * 24 * 60 * 60 * 1000 : 0;

  let files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.dump') && name.startsWith('arucase_'))
    .map((name) => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      return { full, name, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (maxAgeMs > 0) {
    for (const f of files) {
      if (now - f.mtime > maxAgeMs) {
        try {
          fs.unlinkSync(f.full);
          console.log('🗑 Removed old backup (retention):', f.name);
        } catch (e) {
          console.warn('Could not remove', f.name, e.message);
        }
      }
    }
    files = files.filter((f) => fs.existsSync(f.full));
  }

  if (maxFiles > 0 && files.length > maxFiles) {
    const drop = files.slice(maxFiles);
    for (const f of drop) {
      try {
        fs.unlinkSync(f.full);
        console.log('🗑 Removed excess backup (max files):', f.name);
      } catch (e) {
        console.warn('Could not remove', f.name, e.message);
      }
    }
  }
}

async function main() {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
  const outFile = path.join(backupsDir, `arucase_${dateStr}_${timeStr}.dump`);

  const env = { ...process.env };
  let args;
  if (env.DATABASE_URL) {
    args = ['-Fc', '-f', outFile, '-d', env.DATABASE_URL];
  } else {
    const db = env.PGDATABASE || env.POSTGRES_DB || 'railway';
    args = ['-Fc', '-f', outFile, '-d', db];
  }

  console.log('📦 Running pg_dump…');
  await runCmd('pg_dump', args, env);
  console.log('✅ Backup written to:', outFile);

  const verify =
    process.env.BACKUP_VERIFY === undefined || process.env.BACKUP_VERIFY === '1' || process.env.BACKUP_VERIFY === 'true';
  if (verify) {
    console.log('🔎 Verifying dump (pg_restore -l)…');
    await verifyDump(outFile);
    console.log('✅ Dump archive is readable.');
  }

  pruneBackups(backupsDir);
}

main().catch((err) => {
  console.error(err.message || err);
  console.error('Ensure PostgreSQL client tools are installed and .env has correct DATABASE_URL or PG* settings.');
  process.exit(1);
});
