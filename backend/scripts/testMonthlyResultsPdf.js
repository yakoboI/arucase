#!/usr/bin/env node
/**
 * Smoke-test monthly results PDF generation (requires DATABASE_URL in .env).
 * Usage: node scripts/testMonthlyResultsPdf.js FORM IV A 2025 November
 */
require('dotenv').config();
const { generateMonthlyResultsPDF } = require('../utils/pdfGenerator');

async function main() {
  const [level = 'FORM IV', stream = 'A', year = '2025', month = 'November'] = process.argv.slice(2);
  console.log('Testing PDF:', { level, stream, year, month });
  const buffer = await generateMonthlyResultsPDF(level, stream, year, month);
  const isPdf =
    buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  console.log('OK:', { bytes: buffer.length, isPdf });
  process.exit(isPdf ? 0 : 1);
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
