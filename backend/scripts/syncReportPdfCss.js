#!/usr/bin/env node
/**
 * Keeps backend/assets/pdf-report/IndividualReportDetail.css in sync with the frontend
 * source used for on-screen reports. Run from repo root or backend after CSS edits:
 *   cd backend && npm run sync-report-pdf-css
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../frontend/src/pages/reports/IndividualReportDetail.css');
const destDir = path.join(__dirname, '../assets/pdf-report');
const dest = path.join(destDir, 'IndividualReportDetail.css');

if (!fs.existsSync(src)) {
  console.warn('[sync-report-pdf-css] Source not found (skip in backend-only trees):', src);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('[sync-report-pdf-css] Updated', dest);
