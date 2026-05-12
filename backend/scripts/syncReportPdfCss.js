#!/usr/bin/env node
/**
 * Keeps backend/assets/pdf-report/*.css in sync with frontend sources so Puppeteer PDFs
 * (individual + bulk) match production when the frontend tree is not in the container.
 * Run after CSS edits:
 *   cd backend && npm run sync-report-pdf-css
 */
const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '../assets/pdf-report');
const pairs = [
  {
    name: 'IndividualReportDetail.css',
    src: path.join(__dirname, '../../frontend/src/pages/reports/IndividualReportDetail.css')
  },
  {
    name: 'BulkReport.css',
    src: path.join(__dirname, '../../frontend/src/pages/reports/BulkReport.css')
  }
];

let copied = 0;
for (const { name, src } of pairs) {
  if (!fs.existsSync(src)) {
    console.warn('[sync-report-pdf-css] Source not found (skip):', src);
    continue;
  }
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, name);
  fs.copyFileSync(src, dest);
  console.log('[sync-report-pdf-css] Updated', dest);
  copied += 1;
}

if (copied === 0) {
  process.exit(0);
}
