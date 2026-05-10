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

async function updateAdminPhotosFinal() {
  console.log('🎯 Final fix for administrator photos...');
  
  try {
    // Get local admin photos
    const localUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    const localFiles = fs.existsSync(localUploadsDir) ? fs.readdirSync(localUploadsDir) : [];
    
    console.log(`📸 Found ${localFiles.length} local admin photos:`);
    localFiles.forEach((file, index) => console.log(`  ${index + 1}. ${file}`));
    
    // Get administrators from Railway
    const adminResult = await railwayPool.query(`
      SELECT id, name, photo, display_order 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n📊 Found ${adminResult.rows.length} administrators in Railway:`);
    
    // Map available photos to administrators (first 3 get photos)
    const photoMapping = [
      { adminIndex: 0, photoFile: localFiles[0] }, // Rector
      { adminIndex: 1, photoFile: localFiles[1] }, // Vice Rector  
      { adminIndex: 2, photoFile: localFiles[2] }  // Dean of Spiritual Studies
    ];
    
    // Copy photos to Railway directory
    const railwayUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    if (!fs.existsSync(railwayUploadsDir)) {
      fs.mkdirSync(railwayUploadsDir, { recursive: true });
    }
    
    let updatedCount = 0;
    
    for (const mapping of photoMapping) {
      if (mapping.adminIndex < adminResult.rows.length && mapping.photoFile) {
        const admin = adminResult.rows[mapping.adminIndex];
        const localFilePath = path.join(localUploadsDir, mapping.photoFile);
        const railwayFilePath = path.join(railwayUploadsDir, mapping.photoFile);
        const newPhotoPath = `uploads/administrators/${mapping.photoFile}`;
        
        // Copy photo file
        if (fs.existsSync(localFilePath)) {
          fs.copyFileSync(localFilePath, railwayFilePath);
          console.log(`📸 Copied: ${mapping.photoFile}`);
          
          // Update database
          await railwayPool.query(`
            UPDATE administrators 
            SET photo = $1, updated_at = NOW()
            WHERE id = $2
          `, [newPhotoPath, admin.id]);
          
          console.log(`✅ Updated ${admin.name} with photo: ${mapping.photoFile}`);
          updatedCount++;
        }
      }
    }
    
    // Clear photos for remaining administrators
    for (let i = photoMapping.length; i < adminResult.rows.length; i++) {
      const admin = adminResult.rows[i];
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = NULL, updated_at = NOW()
        WHERE id = $1
      `, [admin.id]);
      
      console.log(`🗑️  Cleared photo for: ${admin.name}`);
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Photos updated: ${updatedCount}`);
    console.log(`  - Photos cleared: ${adminResult.rows.length - updatedCount}`);
    
    // Final verification
    const verifyResult = await railwayPool.query(`
      SELECT id, name, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n✅ Final verification:`);
    verifyResult.rows.forEach((admin, index) => {
      const hasPhoto = admin.photo ? '✅' : '❌';
      console.log(`  ${index + 1}. ${hasPhoto} ${admin.name}: ${admin.photo || 'No photo'}`);
    });

  } catch (error) {
    console.error('❌ Error in final admin photo update:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

updateAdminPhotosFinal()
  .then(() => {
    console.log('✅ Final admin photo update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Final admin photo update failed:', error);
    process.exit(1);
  });
