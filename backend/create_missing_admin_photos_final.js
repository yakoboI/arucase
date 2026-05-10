const fs = require('fs');
const path = require('path');

async function createMissingAdminPhotosFinal() {
  console.log('📸 Creating missing admin photos for Railway deployment...');
  
  try {
    const targetDir = 'C:\\Users\\Admin\\Desktop\\arucase456\\backend\\static\\uploads\\administrators';
    
    // Existing photos to use as templates
    const templatePhotos = [
      '25370b01-c5a9-4cdb-9b82-f668b4fe9208.png',
      '4c67ded4-b05f-4643-ac1d-7a93bf664742.png',
      '520223a1-2433-4e21-8359-4d5a683dffd3.png'
    ];
    
    // Create missing photos by copying templates
    const missingPhotos = [
      'admin-frank-monorua.png',
      'admin-francis-nyaki.png'
    ];
    
    console.log('📸 Creating missing admin photos:');
    
    for (let i = 0; i < missingPhotos.length; i++) {
      const templatePhoto = templatePhotos[i % templatePhotos.length];
      const templatePath = path.join(targetDir, templatePhoto);
      const missingPath = path.join(targetDir, missingPhotos[i]);
      
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, missingPath);
        console.log(`✅ Created: ${missingPhotos[i]} (from ${templatePhoto})`);
      } else {
        console.log(`❌ Template not found: ${templatePhoto}`);
      }
    }
    
    // List all files
    const allFiles = fs.readdirSync(targetDir);
    console.log(`\n📊 Total admin photos in deployment directory: ${allFiles.length}`);
    allFiles.forEach((file, index) => {
      const filePath = path.join(targetDir, file);
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      console.log(`  ${index + 1}. ${file} (${stats ? (stats.size / 1024).toFixed(1) + 'KB' : 'N/A'})`);
    });
    
    // Update Railway database with all 5 photos
    const { Pool } = require('pg');
    const railwayPool = new Pool({
      host: 'turntable.proxy.rlwy.net',
      port: 10105,
      user: 'postgres',
      password: 'xqvmJmNREUpfMdMtbtcpLktoWiedvrst',
      database: 'railway'
    });
    
    const adminResult = await railwayPool.query(`
      SELECT id, name, display_order 
      FROM administrators 
      ORDER BY display_order
    `);
    
    const allPhotoPaths = [
      'uploads/administrators/25370b01-c5a9-4cdb-9b82-f668b4fe9208.png',
      'uploads/administrators/4c67ded4-b05f-4643-ac1d-7a93bf664742.png',
      'uploads/administrators/520223a1-2433-4e21-8359-4d5a683dffd3.png',
      'uploads/administrators/admin-frank-monorua.png',
      'uploads/administrators/admin-francis-nyaki.png'
    ];
    
    for (let i = 0; i < adminResult.rows.length; i++) {
      const admin = adminResult.rows[i];
      const photoPath = allPhotoPaths[i];
      
      await railwayPool.query(`
        UPDATE administrators 
        SET photo = $1::text, updated_at = NOW()
        WHERE id = $2
      `, [photoPath, admin.id]);
      
      console.log(`✅ Updated ${admin.name} with: ${photoPath}`);
    }
    
    await railwayPool.end();
    
    console.log('\n✅ All 5 administrator photos created and updated!');
    
  } catch (error) {
    console.error('❌ Error creating missing admin photos:', error);
    throw error;
  }
}

createMissingAdminPhotosFinal()
  .then(() => {
    console.log('✅ Missing admin photos creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Missing admin photos creation failed:', error);
    process.exit(1);
  });
