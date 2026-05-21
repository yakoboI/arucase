#!/usr/bin/env node
/**
 * Fail the Railway/Nixpacks build if pg_dump is missing or older than PG_DUMP_MIN_MAJOR (default 18).
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const minMajor = parseInt(process.env.PG_DUMP_MIN_MAJOR || '18', 10);

function pgDumpCandidates() {
  const candidates = [];
  if (process.env.PG_DUMP_PATH) {
    candidates.push(process.env.PG_DUMP_PATH);
  }

  const pgLib = '/usr/lib/postgresql';
  if (fs.existsSync(pgLib)) {
    const versions = fs
      .readdirSync(pgLib, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => Number(b) - Number(a));
    for (const version of versions) {
      candidates.push(path.join(pgLib, version, 'bin', 'pg_dump'));
    }
  }

  candidates.push('pg_dump');
  return [...new Set(candidates)];
}

function readPgDumpVersion(cmd) {
  const out = execFileSync(cmd, ['--version'], { encoding: 'utf8' }).trim();
  const match = out.match(/\(PostgreSQL\)\s*(\d+)/i);
  return { line: out, major: match ? parseInt(match[1], 10) : 0 };
}

let lastVersionLine = '';

for (const cmd of pgDumpCandidates()) {
  if (cmd !== 'pg_dump' && !fs.existsSync(cmd)) continue;
  try {
    const { line, major } = readPgDumpVersion(cmd);
    lastVersionLine = line;
    if (major >= minMajor) {
      console.log(`[verify-pg-dump] OK (${major} >= ${minMajor}): ${cmd}`);
      console.log(`[verify-pg-dump] ${lastVersionLine}`);
      process.exit(0);
    }
    console.log(`[verify-pg-dump] skip ${cmd}: major ${major} < ${minMajor} (${lastVersionLine})`);
  } catch (err) {
    console.log(`[verify-pg-dump] skip ${cmd}: ${err.message}`);
  }
}

console.error(
  `[verify-pg-dump] No pg_dump found with major version >= ${minMajor}.` +
    (lastVersionLine ? ` Last tried: ${lastVersionLine}` : '') +
    ' Install postgresql-client-18 (see backend/nixpacks.toml).'
);
process.exit(1);
