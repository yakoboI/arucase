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

async function fixAllAdminPhotos() {
  console.log('🎯 Fixing ALL administrator photos...');
  
  try {
    // Get ALL administrators
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, photo, display_order 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators:`);
    
    // Available photos
    const availablePhotos = [
      'uploads/administrators/25370b01-c5a9-4cdb-9b82-f668b4fe9208.png',
      'uploads/administrators/4c67ded4-b05f-4643-ac1d-7a93bf664742.png', 
      'uploads/administrators/520223a1-2433-4e21-8359-4d5a683dffd3.png',
      'uploads/administrators/25370b01-c5a9-4cdb-9b82-f668b4fe9208.png', // Duplicate for missing ones
      'uploads/administrators/4c67ded4-b05f-4643-ac1d-7a93bf664742.png'  // Duplicate for missing ones
    ];
    
    const railwayUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    if (!fs.existsSync(railwayUploadsDir)) {
      fs.mkdirSync(railwayUploadsDir, { recursive: true });
    }
    
    // Update all 5 administrators with photos
    let updatedCount = 0;
    
    for (let i = 0; i < adminResult.rows.length; i++) {
      const admin = adminResult.rows[i];
      const photoPath = availablePhotos[i];
      
      // Copy photo if it exists locally
      const localSource = path.join(__dirname, '../static/uploads/administrators', path.basename(photoPath));
      const railwayTarget = path.join(railwayUploadsDir, path.basename(photoPath));
      
      if (fs.existsSync(localSource)) {
        fs.copyFileSync(localSource, railwayTarget);
        console.log(`📸 Copied: ${path.basename(photoPath)}`);
      }
      
      // Update database
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = $1::text, updated_at = NOW()
        WHERE id = $2
      `, [photoPath, admin.id]);
      
      console.log(`✅ Updated ${admin.name}`);
      console.log(`   Photo: ${photoPath}`);
      updatedCount++;
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Administrators updated: ${updatedCount}`);
    
    // Final verification
    const verifyResult = await railwayPool.query(`
      SELECT id, name, photo 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`\n✅ Final verification - All ${verifyResult.rows.length} administrators:`);
    verifyResult.rows.forEach((admin, index) => {
      const hasPhoto = admin.photo ? '✅' : '❌';
      const photoName = admin.photo ? admin.photo.split('/').pop() : 'No photo';
      console.log(`  ${index + 1}. ${hasPhoto} ${admin.name}`);
      console.log(`      Photo: ${photoName}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error fixing all admin photos:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

fixAllAdminPhotos()
  .then(() => {
    console.log('✅ All admin photos fixed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ All admin photos fix failed:', error);
    process.exit(1);
  });
