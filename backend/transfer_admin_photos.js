const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Railway database connection
const railwayPool = new Pool({
  host: 'turntable.proxy.rlwy.net',
  port: 10105,
  user: 'postgres',
  password: 'xqvmJmNREUpfMdMtbtcpLktoWiedvrst',
  database: 'railway'
});

async function transferAdminPhotos() {
  console.log('📸 Transferring administrator photos...');
  
  try {
    // Get administrators with photos from Railway
    const adminResult = await railwayPool.query(`
      SELECT id, name, photo 
      FROM administrators 
      WHERE photo IS NOT NULL AND photo != ''
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators with photos`);
    
    // Local uploads directory
    const localUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    const railwayUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    
    // Ensure Railway uploads directory exists
    if (!fs.existsSync(railwayUploadsDir)) {
      fs.mkdirSync(railwayUploadsDir, { recursive: true });
      console.log('📁 Created Railway administrators uploads directory');
    }
    
    let transferredCount = 0;
    
    for (const admin of adminResult.rows) {
      if (admin.photo) {
        const localPhotoPath = path.join(localUploadsDir, path.basename(admin.photo));
        const railwayPhotoPath = path.join(railwayUploadsDir, path.basename(admin.photo));
        
        // Check if local photo exists
        if (fs.existsSync(localPhotoPath)) {
          // Copy photo to Railway directory
          fs.copyFileSync(localPhotoPath, railwayPhotoPath);
          console.log(`✅ Copied photo for ${admin.name}: ${path.basename(admin.photo)}`);
          transferredCount++;
        } else {
          console.log(`⚠️  Local photo not found for ${admin.name}: ${admin.photo}`);
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Administrators with photos: ${adminResult.rows.length}`);
    console.log(`  - Photos transferred: ${transferredCount}`);
    
    // List files in Railway uploads directory
    const railwayFiles = fs.readdirSync(railwayUploadsDir);
    console.log(`  - Files in Railway uploads directory: ${railwayFiles.length}`);
    railwayFiles.forEach(file => console.log(`    - ${file}`));

  } catch (error) {
    console.error('❌ Error transferring admin photos:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

transferAdminPhotos()
  .then(() => {
    console.log('✅ Admin photo transfer completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin photo transfer failed:', error);
    process.exit(1);
  });
