const { poolFromEnv } = require('./utils/scriptDbPool');
const cloudinary = require('cloudinary').v2;

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function updateAdminPhotosToCloudinary() {
  console.log('☁️ Updating administrator photos to Cloudinary...');
  
  try {
    // Configure Cloudinary with production credentials
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    
    console.log('✅ Cloudinary configured');
    
    // Test Cloudinary connection
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connected');
    
    // Get administrators with local photo paths
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators to update:`);
    
    let updatedCount = 0;
    
    for (const admin of adminResult.rows) {
      if (admin.photo && !admin.photo.startsWith('http')) {
        console.log(`\n🔄 Processing: ${admin.name}`);
        console.log(`   Local path: ${admin.photo}`);
        
        try {
          // Upload to Cloudinary
          const localPhotoPath = admin.photo.replace('uploads/administrators/', '');
          const uploadResult = await cloudinary.uploader.upload(localPhotoPath, {
            folder: 'administrator-photos',
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
            public_id: `admin-${admin.id}`
          });
          
          console.log(`   Cloudinary URL: ${uploadResult.secure_url}`);
          console.log(`   Public ID: ${uploadResult.public_id}`);
          
          // Update database with Cloudinary URL
          await railwayPool.query(`
            UPDATE administrators 
            SET photo = $1::text, updated_at = NOW()
            WHERE id = $2
          `, [uploadResult.secure_url, admin.id]);
          
          console.log(`   ✅ Updated database with Cloudinary URL`);
          updatedCount++;
          
        } catch (uploadError) {
          console.log(`   ❌ Upload failed: ${uploadError.message}`);
          
          // Keep local path as fallback
          console.log(`   ⚠️  Keeping local path as fallback`);
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
    console.log(`  - Updated to Cloudinary: ${updatedCount}`);
    
    // Final verification
    const verifyResult = await railwayPool.query(`
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
    console.error('❌ Error updating admin photos to Cloudinary:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

updateAdminPhotosToCloudinary()
  .then(() => {
    console.log('✅ Administrator photos updated to Cloudinary successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Administrator photos update to Cloudinary failed:', error);
    process.exit(1);
  });
