const fs = require('fs');
const path = require('path');
const { poolFromEnv } = require('./utils/scriptDbPool');

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function fixAdminPhotoPaths() {
  console.log('🔧 Fixing administrator photo paths...');
  
  try {
    // Get local admin photos
    const localUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    const localFiles = fs.existsSync(localUploadsDir) ? fs.readdirSync(localUploadsDir) : [];
    
    console.log(`📸 Found ${localFiles.length} local admin photos:`);
    localFiles.forEach(file => console.log(`  - ${file}`));
    
    // Get administrators from Railway
    const adminResult = await railwayPool.query(`
      SELECT id, name, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n📊 Found ${adminResult.rows.length} administrators in Railway:`);
    
    // Map local files to administrators (assuming order)
    const adminUpdates = [];
    
    for (let i = 0; i < Math.min(adminResult.rows.length, localFiles.length); i++) {
      const admin = adminResult.rows[i];
      const localFile = localFiles[i];
      
      console.log(`\n🔄 Updating ${admin.name}:`);
      console.log(`  Old path: ${admin.photo}`);
      console.log(`  New path: uploads/administrators/${localFile}`);
      
      adminUpdates.push({
        id: admin.id,
        newPhotoPath: `uploads/administrators/${localFile}`
      });
    }
    
    // Update database with new photo paths
    for (const update of adminUpdates) {
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = $1, updated_at = NOW()
        WHERE id = $2
      `, [update.newPhotoPath, update.id]);
      
      console.log(`✅ Updated photo path for admin ID: ${update.id}`);
    }
    
    // Copy photos to Railway directory
    const railwayUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    if (!fs.existsSync(railwayUploadsDir)) {
      fs.mkdirSync(railwayUploadsDir, { recursive: true });
    }
    
    let copiedCount = 0;
    for (let i = 0; i < Math.min(adminResult.rows.length, localFiles.length); i++) {
      const localFile = localFiles[i];
      const localFilePath = path.join(localUploadsDir, localFile);
      const railwayFilePath = path.join(railwayUploadsDir, localFile);
      
      if (fs.existsSync(localFilePath)) {
        fs.copyFileSync(localFilePath, railwayFilePath);
        console.log(`📸 Copied photo: ${localFile}`);
        copiedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Administrators updated: ${adminUpdates.length}`);
    console.log(`  - Photos copied: ${copiedCount}`);
    
    // Verify the updates
    const verifyResult = await railwayPool.query(`
      SELECT id, name, photo 
      FROM administrators 
      WHERE photo IS NOT NULL AND photo != ''
      ORDER BY display_order
    `);
    
    console.log(`\n✅ Verification - ${verifyResult.rows.length} administrators with photos:`);
    verifyResult.rows.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.name}: ${admin.photo}`);
    });

  } catch (error) {
    console.error('❌ Error fixing admin photo paths:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

fixAdminPhotoPaths()
  .then(() => {
    console.log('✅ Admin photo paths fixed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin photo path fix failed:', error);
    process.exit(1);
  });
