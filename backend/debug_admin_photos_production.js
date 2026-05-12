const { poolFromEnv } = require('./utils/scriptDbPool');

const railwayPool = poolFromEnv('RAILWAY_DATABASE_URL', 'DATABASE_URL');

async function debugAdminPhotosProduction() {
  console.log('🔍 Debugging admin photos in production...');
  
  try {
    // 1. Check administrators table
    const adminResult = await railwayPool.query(`
      SELECT id, name, title, photo, display_order 
      FROM administrators 
      ORDER BY display_order
    `);
    
    console.log(`📊 Administrators in Railway database:`);
    adminResult.rows.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.name}`);
      console.log(`     Photo path: ${admin.photo || 'NULL'}`);
      console.log(`     Display order: ${admin.display_order}`);
      console.log('');
    });
    
    // 2. Test image URL resolution
    console.log('🌐 Testing image URL resolution...');
    adminResult.rows.forEach((admin, index) => {
      if (admin.photo) {
        // Simulate frontend getImageUrl function
        let imageUrl;
        if (admin.photo.startsWith('http')) {
          imageUrl = admin.photo;
        } else {
          let cleanPath = admin.photo.startsWith('/') ? admin.photo.substring(1) : admin.photo;
          if (cleanPath.startsWith('static/')) {
            imageUrl = `/${cleanPath}`;
          } else if (cleanPath.startsWith('uploads/')) {
            imageUrl = `/static/${cleanPath}`;
          } else {
            imageUrl = `/static/uploads/photos/${cleanPath}`;
          }
        }
        
        console.log(`  Admin ${index + 1}: ${admin.name}`);
        console.log(`    Original path: ${admin.photo}`);
        console.log(`    Resolved URL: ${imageUrl}`);
        console.log(`    Full URL: https://arucase-production.up.railway.app${imageUrl}`);
        console.log('');
      }
    });
    
    // 3. Check if static files exist in Railway
    console.log('📁 Checking static file structure...');
    const fs = require('fs');
    const path = require('path');
    
    const staticDir = path.join(__dirname, '../static');
    const uploadsDir = path.join(staticDir, 'uploads');
    const adminDir = path.join(uploadsDir, 'administrators');
    
    console.log(`Static dir exists: ${fs.existsSync(staticDir)}`);
    console.log(`Uploads dir exists: ${fs.existsSync(uploadsDir)}`);
    console.log(`Admin dir exists: ${fs.existsSync(adminDir)}`);
    
    if (fs.existsSync(adminDir)) {
      const files = fs.readdirSync(adminDir);
      console.log(`Admin photos in local static dir: ${files.length}`);
      files.forEach(file => console.log(`  - ${file}`));
    }
    
    // 4. Test API endpoint
    console.log('🔌 Testing /api/public/administrators endpoint...');
    try {
      const axios = require('axios');
      const response = await axios.get('https://arucase-production.up.railway.app/api/public/administrators');
      console.log(`API Response Status: ${response.status}`);
      console.log(`Administrators in API: ${response.data.administrators?.length || 0}`);
      
      response.data.administrators?.forEach((admin, index) => {
        console.log(`  ${index + 1}. ${admin.name}`);
        console.log(`     Photo: ${admin.photo || 'NULL'}`);
      });
    } catch (error) {
      console.log(`❌ API test failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

debugAdminPhotosProduction()
  .then(() => {
    console.log('✅ Production debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Production debug failed:', error);
    process.exit(1);
  });
