/**
 * PostgreSQL backup utilities.
 * Run directly: node backend/scripts/backupDatabase.js
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const repoRoot = path.join(backendRoot, '..');

require('dotenv').config({ path: path.join(repoRoot, '.env') });
require('dotenv').config({ path: path.join(backendRoot, '.env') });

const backupsDir = path.join(backendRoot, 'backups');
const DEFAULT_MAX_FILES = 20;
const DEFAULT_RETENTION_DAYS = 60;
let cachedPgTools = null;

function needsPgSsl() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_SSL === 'true' ||
    (process.env.DATABASE_URL && /[?&]sslmode=require/i.test(process.env.DATABASE_URL))
  );
}

function normalizeDatabaseUrlForPgTools(urlString) {
  try {
    const parsedUrl = new URL(urlString);
    if (needsPgSsl() && !parsedUrl.searchParams.has('sslmode')) {
      parsedUrl.searchParams.set('sslmode', 'require');
    }
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function pgToolEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  if (needsPgSsl() && !env.PGSSLMODE) {
    env.PGSSLMODE = 'require';
  }
  return env;
}

function runCmd(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
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

async function canRunCommand(command, versionArg = '--version') {
  try {
    await runCmd(command, [versionArg], process.env);
    return true;
  } catch {
    return false;
  }
}

function getWindowsPostgresBinCandidates() {
  const roots = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean);
  const candidates = [];

  for (const root of roots) {
    const pgRoot = path.join(root, 'PostgreSQL');
    if (!fs.existsSync(pgRoot)) continue;

    let versionDirs = [];
    try {
      versionDirs = fs
        .readdirSync(pgRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => Number(b) - Number(a));
    } catch {
      continue;
    }

    for (const versionDir of versionDirs) {
      candidates.push(path.join(pgRoot, versionDir, 'bin'));
    }
  }

  return candidates;
}

async function resolvePgTools() {
  if (cachedPgTools) return cachedPgTools;

  const directPgDumpOk = await canRunCommand('pg_dump');
  const directPgRestoreOk = await canRunCommand('pg_restore');

  if (directPgDumpOk) {
    cachedPgTools = {
      pgDumpCmd: 'pg_dump',
      pgRestoreCmd: directPgRestoreOk ? 'pg_restore' : null,
    };
    return cachedPgTools;
  }

  const isWindows = process.platform === 'win32';
  if (!isWindows) {
    cachedPgTools = { pgDumpCmd: null, pgRestoreCmd: null };
    return cachedPgTools;
  }

  for (const binDir of getWindowsPostgresBinCandidates()) {
    const dumpPath = path.join(binDir, 'pg_dump.exe');
    const restorePath = path.join(binDir, 'pg_restore.exe');
    if (!fs.existsSync(dumpPath)) continue;

    const dumpOk = await canRunCommand(dumpPath);
    if (!dumpOk) continue;

    const restoreOk = fs.existsSync(restorePath) && (await canRunCommand(restorePath));
    cachedPgTools = {
      pgDumpCmd: dumpPath,
      pgRestoreCmd: restoreOk ? restorePath : null,
    };
    return cachedPgTools;
  }

  cachedPgTools = { pgDumpCmd: null, pgRestoreCmd: null };
  return cachedPgTools;
}

function ensureBackupsDir() {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
}

function toBackupRecord(fullPath, stat) {
  return {
    name: path.basename(fullPath),
    path: fullPath,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    mtimeMs: stat.mtimeMs,
  };
}

function listBackups(limit = DEFAULT_MAX_FILES) {
  ensureBackupsDir();
  return fs
    .readdirSync(backupsDir)
    .filter((name) => name.endsWith('.dump') && name.startsWith('arucase_'))
    .map((name) => {
      const full = path.join(backupsDir, name);
      const stat = fs.statSync(full);
      return toBackupRecord(full, stat);
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, Math.max(1, limit));
}

async function verifyDump(dumpPath) {
  const { pgRestoreCmd } = await resolvePgTools();
  if (!pgRestoreCmd) {
    throw new Error('pg_restore is not available in PATH. Install PostgreSQL client tools and restart the server.');
  }
  await runCmd(pgRestoreCmd, ['-l', dumpPath], process.env);
}

function pruneBackups(dir = backupsDir) {
  ensureBackupsDir();
  const retentionDays = Math.max(0, parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS);
  const maxFiles = Math.max(0, parseInt(process.env.BACKUP_MAX_FILES, 10) || DEFAULT_MAX_FILES);
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
          console.log('Removed old backup (retention):', f.name);
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
        console.log('Removed excess backup (max files):', f.name);
      } catch (e) {
        console.warn('Could not remove', f.name, e.message);
      }
    }
  }
}

async function createBackup({ verify = true } = {}) {
  ensureBackupsDir();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');
  const outFile = path.join(backupsDir, `arucase_${dateStr}_${timeStr}.dump`);

  const env = pgToolEnv({ ...process.env });
  let args;
  let normalizedDatabaseUrl = null;
  if (env.DATABASE_URL) {
    // Validate URL and add sslmode=require for managed Postgres (Railway) when needed.
    normalizedDatabaseUrl = normalizeDatabaseUrlForPgTools(env.DATABASE_URL);
  }

  if (normalizedDatabaseUrl) {
    args = ['-Fc', '-f', outFile, '-d', normalizedDatabaseUrl];
  } else {
    const db = env.PGDATABASE || env.POSTGRES_DB || 'railway';
    const host = env.PGHOST || '127.0.0.1';
    const port = String(env.PGPORT || '5432');
    const user = env.PGUSER || 'postgres';
    args = ['-Fc', '-f', outFile, '-h', host, '-p', port, '-U', user, '-d', db];
  }

  const { pgDumpCmd, pgRestoreCmd } = await resolvePgTools();
  if (!pgDumpCmd) {
    throw new Error('pg_dump is not available in PATH. Install PostgreSQL client tools and restart the server.');
  }

  await runCmd(pgDumpCmd, args, env);

  if (verify) {
    if (pgRestoreCmd) {
      await verifyDump(outFile);
    } else {
      console.warn('Skipping backup verification because pg_restore is not available in PATH.');
    }
  }

  pruneBackups(backupsDir);
  const stat = fs.statSync(outFile);
  return toBackupRecord(outFile, stat);
}

async function main() {
  const verify =
    process.env.BACKUP_VERIFY === undefined ||
    process.env.BACKUP_VERIFY === '1' ||
    process.env.BACKUP_VERIFY === 'true';
  console.log('Running database backup...');
  const backup = await createBackup({ verify });
  console.log('Backup written to:', backup.path);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    console.error('Ensure PostgreSQL client tools are installed and .env has correct DATABASE_URL or PG* settings.');
    process.exit(1);
  });
}

module.exports = {
  backupsDir,
  createBackup,
  listBackups,
  pruneBackups,
};
