const { poolFromEnv } = require('./utils/scriptDbPool');

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function updateRailwayAdminPhotos() {
  console.log('🎯 Updating Railway admin photos with correct paths...');
  
  try {
    // Available photo files
    const availablePhotos = [
      'uploads/administrators/25370b01-c5a9-4cdb-9b82-f668b4fe9208.png',
      'uploads/administrators/4c67ded4-b05f-4643-ac1d-7a93bf664742.png', 
      'uploads/administrators/520223a1-2433-4e21-8359-4d5a683dffd3.png'
    ];
    
    // Get administrators ordered by display_order
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, display_order 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators:`);
    
    // Update first 3 administrators with available photos
    let updatedCount = 0;
    for (let i = 0; i < Math.min(3, adminResult.rows.length); i++) {
      const admin = adminResult.rows[i];
      const photoPath = availablePhotos[i];
      
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = $1, updated_at = NOW()
        WHERE id = $2
      `, [photoPath, admin.id]);
      
      console.log(`✅ Updated ${admin.name} (${admin.title})`);
      console.log(`   Photo: ${photoPath}`);
      updatedCount++;
    }
    
    // Clear photos for remaining administrators
    for (let i = 3; i < adminResult.rows.length; i++) {
      const admin = adminResult.rows[i];
      
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = NULL, updated_at = NOW()
        WHERE id = $2
      `, [null, admin.id]);
      
      console.log(`🗑️  Cleared photo for ${admin.name} (${admin.title})`);
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Administrators updated: ${updatedCount}`);
    console.log(`  - Photos cleared: ${adminResult.rows.length - updatedCount}`);
    
    // Final verification
    const verifyResult = await railwayPool.query(`
      SELECT id, name, title, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n✅ Final verification:`);
    verifyResult.rows.forEach((admin, index) => {
      const hasPhoto = admin.photo ? '✅' : '❌';
      const photoName = admin.photo ? admin.photo.split('/').pop() : 'No photo';
      console.log(`  ${index + 1}. ${hasPhoto} ${admin.name}`);
      console.log(`      Title: ${admin.title}`);
      console.log(`      Photo: ${photoName}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error updating Railway admin photos:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

updateRailwayAdminPhotos()
  .then(() => {
    console.log('✅ Railway admin photos updated successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Railway admin photo update failed:', error);
    process.exit(1);
  });
