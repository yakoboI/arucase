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
    
    // Get administrators with photos
    const adminResult = await pool.query(`
      SELECT id, name, title, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators to process:`);
    
    let uploadedCount = 0;
    
    for (const admin of adminResult.rows) {
      if (admin.photo && !admin.photo.startsWith('http')) {
        console.log(`\n🔄 Processing: ${admin.name}`);
        console.log(`   Local path: ${admin.photo}`);
        
        try {
          // Get local photo filename
          const filename = admin.photo.split('/').pop();
          
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
        }
      } else if (admin.photo && admin.photo.startsWith('http')) {
        console.log(`✅ ${admin.name} already has Cloudinary URL`);
        console.log(`   URL: ${admin.photo}`);
      } else {
        console.log(`⚠️  ${admin.name} has no photo`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Administrators processed: ${adminResult.rows.length}`);
    console.log(`  - Uploaded to Cloudinary: ${uploadedCount}`);
    
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

uploadAdminPhotosToCloudinaryProduction()
  .then(() => {
    console.log('✅ Admin photos uploaded to Cloudinary successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin photos upload to Cloudinary failed:', error);
    process.exit(1);
  });
