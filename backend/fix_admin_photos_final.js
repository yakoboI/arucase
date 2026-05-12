const { poolFromEnv } = require('./utils/scriptDbPool');

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function fixAdminPhotosFinal() {
  console.log('🎯 Final fix for Railway admin photos...');
  
  try {
    // Get administrators ordered by display_order
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, display_order 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators:`);
    
    // Available photo files with explicit mapping
    const photoUpdates = [
      {
        adminId: adminResult.rows[0]?.id,
        adminName: adminResult.rows[0]?.name,
        photoPath: 'uploads/administrators/25370b01-c5a9-4cdb-9b82-f668b4fe9208.png'
      },
      {
        adminId: adminResult.rows[1]?.id,
        adminName: adminResult.rows[1]?.name,
        photoPath: 'uploads/administrators/4c67ded4-b05f-4643-ac1d-7a93bf664742.png'
      },
      {
        adminId: adminResult.rows[2]?.id,
        adminName: adminResult.rows[2]?.name,
        photoPath: 'uploads/administrators/520223a1-2433-4e21-8359-4d5a683dffd3.png'
      }
    ];
    
    // Update first 3 administrators with photos
    let updatedCount = 0;
    for (const update of photoUpdates) {
      if (update.adminId && update.photoPath) {
        await railwayPool.query(`
          UPDATE administrators 
          SET photo = $1::text, updated_at = NOW()
          WHERE id = $2
        `, [update.photoPath, update.adminId]);
        
        console.log(`✅ Updated ${update.adminName}`);
        console.log(`   Photo: ${update.photoPath}`);
        updatedCount++;
      }
    }
    
    // Clear photos for remaining administrators
    for (let i = 3; i < adminResult.rows.length; i++) {
      const admin = adminResult.rows[i];
      
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = NULL::text, updated_at = NOW()
        WHERE id = $1
      `, [admin.id]);
      
      console.log(`🗑️  Cleared photo for ${admin.name}`);
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
    console.error('❌ Error in final admin photo fix:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

fixAdminPhotosFinal()
  .then(() => {
    console.log('✅ Final admin photo fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Final admin photo fix failed:', error);
    process.exit(1);
  });
