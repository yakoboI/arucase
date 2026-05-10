#!/usr/bin/env node

/**
 * Admin Photos Volume Setup Script
 *
 * Copies admin photos from the committed source directory
 * (backend/admin-photos-source/) into the Railway persistent volume
 * mounted at /app/admin-photos so that the Cloudinary upload script
 * can find and migrate them.
 *
 * Run automatically by scripts/start-server.js on every deployment.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Source: committed alongside the repo (relative to this script's location)
const SOURCE_DIR = path.join(__dirname, '../admin-photos-source');

// Destination: Railway persistent volume
const VOLUME_DIR = '/app/admin-photos';

// The 5 expected admin photos
const EXPECTED_PHOTOS = [
  '25370b01-c5a9-4cdb-9b82-f668b4fe9208.png',
  '4c67ded4-b05f-4643-ac1d-7a93bf664742.png',
  '520223a1-2433-4e21-8359-4d5a683dffd3.png',
  'admin-francis-nyaki.png',
  'admin-frank-monorua.png',
];

function setupAdminPhotosVolume() {
  console.log('📸 [admin-photos-setup] Starting admin photos volume setup...');
  console.log(`   Source : ${SOURCE_DIR}`);
  console.log(`   Volume : ${VOLUME_DIR}`);

  // ── 1. Verify source directory exists ──────────────────────────────────────
  if (!fs.existsSync(SOURCE_DIR)) {
    console.warn(`⚠️  [admin-photos-setup] Source directory not found: ${SOURCE_DIR}`);
    console.warn('   Skipping volume setup — photos will not be available for Cloudinary upload.');
    return;
  }

  const sourceFiles = fs.readdirSync(SOURCE_DIR).filter(f => f.toLowerCase().endsWith('.png'));
  console.log(`   Found ${sourceFiles.length} PNG file(s) in source directory.`);

  if (sourceFiles.length === 0) {
    console.warn('⚠️  [admin-photos-setup] No PNG files found in source directory.');
    console.warn('   Add the 5 admin photos to backend/admin-photos-source/ and redeploy.');
    return;
  }

  // ── 2. Ensure volume directory exists ──────────────────────────────────────
  if (!fs.existsSync(VOLUME_DIR)) {
    try {
      fs.mkdirSync(VOLUME_DIR, { recursive: true });
      console.log(`   Created volume directory: ${VOLUME_DIR}`);
    } catch (err) {
      console.error(`❌ [admin-photos-setup] Cannot create volume directory: ${err.message}`);
      console.error('   Ensure the admin-photos volume is mounted at /app/admin-photos on Railway.');
      return;
    }
  }

  // ── 3. Copy each photo to the volume (skip if already present) ─────────────
  let copiedCount  = 0;
  let skippedCount = 0;
  let failedCount  = 0;

  for (const filename of sourceFiles) {
    const src  = path.join(SOURCE_DIR, filename);
    const dest = path.join(VOLUME_DIR, filename);

    try {
      if (fs.existsSync(dest)) {
        const srcSize  = fs.statSync(src).size;
        const destSize = fs.statSync(dest).size;

        if (srcSize === destSize) {
          console.log(`   ⏭  Skipped (already present, same size): ${filename}`);
          skippedCount++;
          continue;
        }

        // Sizes differ — overwrite with the source copy
        console.log(`   🔄 Overwriting (size mismatch): ${filename}`);
      }

      fs.copyFileSync(src, dest);
      const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`   ✅ Copied: ${filename} (${sizeKB} KB)`);
      copiedCount++;
    } catch (err) {
      console.error(`   ❌ Failed to copy ${filename}: ${err.message}`);
      failedCount++;
    }
  }

  // ── 4. Verify all 5 expected photos are present in the volume ──────────────
  console.log('\n📋 [admin-photos-setup] Verifying expected photos in volume...');
  let missingCount = 0;

  for (const expected of EXPECTED_PHOTOS) {
    const dest = path.join(VOLUME_DIR, expected);
    if (fs.existsSync(dest)) {
      const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log(`   ✅ ${expected} (${sizeKB} KB)`);
    } else {
      console.warn(`   ⚠️  MISSING: ${expected}`);
      missingCount++;
    }
  }

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  console.log('\n📊 [admin-photos-setup] Summary:');
  console.log(`   Copied  : ${copiedCount}`);
  console.log(`   Skipped : ${skippedCount}`);
  console.log(`   Failed  : ${failedCount}`);
  console.log(`   Missing : ${missingCount} of ${EXPECTED_PHOTOS.length} expected photos`);

  if (missingCount === 0 && failedCount === 0) {
    console.log('✅ [admin-photos-setup] All admin photos are ready in the volume.');
  } else if (missingCount > 0) {
    console.warn(`⚠️  [admin-photos-setup] ${missingCount} photo(s) still missing from volume.`);
    console.warn('   Add the missing photos to backend/admin-photos-source/ and redeploy.');
  }

  if (failedCount > 0) {
    console.error(`❌ [admin-photos-setup] ${failedCount} photo(s) failed to copy.`);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
// When run directly (node scripts/setup-admin-photos-volume.js) execute and exit.
// When required by start-server.js it runs synchronously before the server starts.
setupAdminPhotosVolume();

module.exports = { setupAdminPhotosVolume };
