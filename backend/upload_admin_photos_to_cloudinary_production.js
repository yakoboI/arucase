const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Volume path where admin photos are stored on Railway
const ADMIN_PHOTOS_DIR = '/app/admin-photos';

// Railway database connection
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'railway',
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function uploadAdminPhotosToCloudinaryProduction() {
  console.log('☁️ Uploading admin photos to Cloudinary in production...');
  
  try {
    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('❌ Cloudinary credentials not found in environment');
      console.log('📋 Required variables:');
      console.log(`  CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME || 'MISSING'}`);
      console.log(`  CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING'}`);
      console.log(`  CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'}`);
      return;
    }
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    
    console.log('✅ Cloudinary configured');
    
    // Test connection
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connected');

    // Check that the volume directory exists and list PNG files
    if (!fs.existsSync(ADMIN_PHOTOS_DIR)) {
      console.log(`❌ Volume directory not found: ${ADMIN_PHOTOS_DIR}`);
      console.log('   Ensure the admin-photos volume is mounted at /app/admin-photos on Railway.');
      return;
    }

    const volumeFiles = fs.readdirSync(ADMIN_PHOTOS_DIR).filter(f => f.toLowerCase().endsWith('.png'));
    console.log(`\n📁 Found ${volumeFiles.length} PNG file(s) in ${ADMIN_PHOTOS_DIR}:`);
    volumeFiles.forEach(f => console.log(`   - ${f}`));

    if (volumeFiles.length === 0) {
      console.log('⚠️  No PNG files found in the volume. Nothing to upload.');
      return;
    }
    
    // Get administrators with photos
    const adminResult = await pool.query(`
      SELECT id, name, title, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n📊 Found ${adminResult.rows.length} administrators to process:`);
    
    let uploadedCount = 0;
    
    for (const admin of adminResult.rows) {
      if (admin.photo && admin.photo.startsWith('http')) {
        console.log(`✅ ${admin.name} already has Cloudinary URL`);
        console.log(`   URL: ${admin.photo}`);
        continue;
      }

      if (!admin.photo) {
        console.log(`⚠️  ${admin.name} has no photo`);
        continue;
      }

      // Derive the filename from the database path and look it up in the volume
      const dbFilename = admin.photo.split('/').pop();
      const volumePath = path.join(ADMIN_PHOTOS_DIR, dbFilename);

      console.log(`\n🔄 Processing: ${admin.name}`);
      console.log(`   DB path:     ${admin.photo}`);
      console.log(`   Volume path: ${volumePath}`);

      if (!fs.existsSync(volumePath)) {
        // Try a case-insensitive match among the files already listed
        const match = volumeFiles.find(f => f.toLowerCase() === dbFilename.toLowerCase());
        if (!match) {
          console.log(`   ⚠️  File not found in volume — skipping`);
          continue;
        }
        // Use the matched filename instead
        const resolvedPath = path.join(ADMIN_PHOTOS_DIR, match);
        console.log(`   ℹ️  Resolved to: ${resolvedPath}`);
        await uploadAndUpdate(admin, resolvedPath);
      } else {
        await uploadAndUpdate(admin, volumePath);
      }

      uploadedCount++;
    }

    // Upload any volume files that did not match a DB record (orphaned files)
    console.log('\n🔍 Checking for unmatched volume files...');
    const dbFilenames = adminResult.rows
      .filter(a => a.photo && !a.photo.startsWith('http'))
      .map(a => a.photo.split('/').pop().toLowerCase());

    for (const file of volumeFiles) {
      if (!dbFilenames.includes(file.toLowerCase())) {
        console.log(`   ℹ️  ${file} has no matching DB record — skipping`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Administrators processed: ${adminResult.rows.length}`);
    console.log(`  - Uploaded to Cloudinary:   ${uploadedCount}`);
    
    // Final verification
    const verifyResult = await pool.query(`
      SELECT id, name, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n✅ Final verification - All ${verifyResult.rows.length} administrators:`);
    verifyResult.rows.forEach((admin, index) => {
      const isCloudinary = admin.photo && admin.photo.startsWith('http');
      const status = isCloudinary ? '☁️' : '📁';
      console.log(`  ${index + 1}. ${status} ${admin.name}`);
      console.log(`      ${isCloudinary ? 'Cloudinary' : 'Local'}: ${admin.photo || 'No photo'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error uploading admin photos to Cloudinary:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function uploadAndUpdate(admin, filePath) {
  try {
    // Upload to Cloudinary using the full volume path
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'administrator-photos',
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      public_id: `admin-${admin.id}`,
      overwrite: true
    });
    
    console.log(`   ✅ Uploaded to Cloudinary`);
    console.log(`   URL: ${uploadResult.secure_url}`);
    console.log(`   Public ID: ${uploadResult.public_id}`);
    
    // Update database with Cloudinary URL
    await pool.query(`
      UPDATE administrators 
      SET photo = $1::text, updated_at = NOW()
      WHERE id = $2
    `, [uploadResult.secure_url, admin.id]);
    
    console.log(`   ✅ Database updated`);
  } catch (uploadError) {
    console.log(`   ❌ Upload failed: ${uploadError.message}`);
    throw uploadError;
  }
}

uploadAdminPhotosToCloudinaryProduction()
  .then(() => {
    console.log('✅ Admin photos uploaded to Cloudinary successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin photos upload to Cloudinary failed:', error);
    process.exit(1);
  });
