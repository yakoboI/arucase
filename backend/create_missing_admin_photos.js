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

async function createMissingAdminPhotos() {
  console.log('📸 Creating missing administrator photos...');
  
  try {
    // Create placeholder photos for missing administrators
    const railwayUploadsDir = path.join(__dirname, '../static/uploads/administrators');
    
    if (!fs.existsSync(railwayUploadsDir)) {
      fs.mkdirSync(railwayUploadsDir, { recursive: true });
    }
    
    // Get administrators without photos
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, display_order 
      FROM administrators 
      WHERE photo IS NULL OR photo = ''
      ORDER BY display_order
    `);
    
    console.log(`📊 Found ${adminResult.rows.length} administrators without photos:`);
    
    // Use existing photos as templates for missing ones
    const existingPhotos = [
      '25370b01-c5a9-4cdb-9b82-f668b4fe9208.png',
      '4c67ded4-b05f-4643-ac1d-7a93bf664742.png', 
      '520223a1-2433-4e21-8359-4d5a683dffd3.png'
    ];
    
    let updatedCount = 0;
    
    for (let i = 0; i < adminResult.rows.length; i++) {
      const admin = adminResult.rows[i];
      
      // Use one of existing photos as template (cycle through them)
      const templatePhoto = existingPhotos[i % existingPhotos.length];
      const sourcePath = path.join(__dirname, '../static/uploads/administrators', templatePhoto);
      
      if (fs.existsSync(sourcePath)) {
        // Create new filename for this admin
        const newFilename = `admin-${admin.id}-placeholder.png`;
        const targetPath = path.join(railwayUploadsDir, newFilename);
        const photoPath = `uploads/administrators/${newFilename}`;
        
        // Copy the template photo
        fs.copyFileSync(sourcePath, targetPath);
        
        // Update database
        await railwayPool.query(`
          UPDATE administrators 
          SET photo = $1::text, updated_at = NOW()
          WHERE id = $2
        `, [photoPath, admin.id]);
        
        console.log(`✅ Created photo for ${admin.name}`);
        console.log(`   File: ${newFilename}`);
        console.log(`   Path: ${photoPath}`);
        updatedCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Photos created: ${updatedCount}`);
    
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
      console.log(`      ${admin.title}`);
      console.log(`      Photo: ${photoName}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error creating missing admin photos:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

createMissingAdminPhotos()
  .then(() => {
    console.log('✅ Missing admin photos created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Missing admin photos creation failed:', error);
    process.exit(1);
  });
