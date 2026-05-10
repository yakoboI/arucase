#!/usr/bin/env node

const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;

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

async function deployAdminPhotosToCloudinary() {
  console.log('☁️ Railway: Deploying admin photos to Cloudinary...');
  
  try {
    // Check Cloudinary configuration
    console.log('📋 Checking Cloudinary environment variables:');
    console.log(`  CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅ SET' : '❌ MISSING'}`);
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('❌ Cloudinary credentials not configured in Railway environment');
      console.log('⚠️  Please add these variables in Railway Dashboard:');
      console.log('   - CLOUDINARY_CLOUD_NAME');
      console.log('   - CLOUDINARY_API_KEY');
      console.log('   - CLOUDINARY_API_SECRET');
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
    
    // Get administrators with local photo paths
    const adminResult = await pool.query(`
      SELECT id, name, title, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators to process:`);
    
    let uploadedCount = 0;
    let skippedCount = 0;
    
    for (const admin of adminResult.rows) {
      if (admin.photo && !admin.photo.startsWith('http')) {
        console.log(`\n🔄 Processing: ${admin.name}`);
        console.log(`   Local path: ${admin.photo}`);
        
        try {
          // Upload to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(admin.photo, {
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
          uploadedCount++;
          
        } catch (uploadError) {
          console.log(`   ❌ Upload failed: ${uploadError.message}`);
          skippedCount++;
        }
      } else if (admin.photo && admin.photo.startsWith('http')) {
        console.log(`✅ ${admin.name} already has Cloudinary URL`);
        console.log(`   URL: ${admin.photo}`);
        skippedCount++;
      } else {
        console.log(`⚠️  ${admin.name} has no photo`);
        skippedCount++;
      }
    }
    
    console.log(`\n📊 Deployment Summary:`);
    console.log(`  - Total administrators: ${adminResult.rows.length}`);
    console.log(`  - Uploaded to Cloudinary: ${uploadedCount}`);
    console.log(`  - Skipped/Already Cloudinary: ${skippedCount}`);
    
    // Final verification
    const verifyResult = await pool.query(`
      SELECT id, name, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n✅ Final Verification - All ${verifyResult.rows.length} administrators:`);
    verifyResult.rows.forEach((admin, index) => {
      const isCloudinary = admin.photo && admin.photo.startsWith('http');
      const status = isCloudinary ? '☁️' : '📁';
      const source = isCloudinary ? 'Cloudinary' : 'Local';
      console.log(`  ${index + 1}. ${status} ${admin.name}`);
      console.log(`      Source: ${source}`);
      console.log(`      Photo: ${admin.photo || 'No photo'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Railway deployment failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

deployAdminPhotosToCloudinary()
  .then(() => {
    console.log('✅ Railway admin photos deployment completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Railway admin photos deployment failed:', error);
    process.exit(1);
  });
