const fs = require('fs');
const path = require('path');

// Copy admin photos to Railway deployment directory
async function deployAdminPhotosToRailway() {
  console.log('🚀 Deploying admin photos to Railway...');
  
  try {
    const sourceDir = path.join(__dirname, '../static/uploads/administrators');
    const targetDir = path.join(__dirname, '../static/uploads/administrators');
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('📁 Created target directory');
    }
    
    // Copy all admin photos
    if (fs.existsSync(sourceDir)) {
      const files = fs.readdirSync(sourceDir);
      console.log(`📸 Found ${files.length} admin photos to deploy:`);
      
      files.forEach((file, index) => {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`  ${index + 1}. ✅ ${file}`);
        }
      });
      
      console.log(`\n📊 Summary: ${files.length} admin photos deployed`);
      
      // Verify deployment
      const deployedFiles = fs.readdirSync(targetDir);
      console.log(`📁 Deployed files in Railway static dir: ${deployedFiles.length}`);
      deployedFiles.forEach(file => console.log(`  - ${file}`));
      
    } else {
      console.log('❌ Source admin photos directory not found');
    }
    
    // Create a deployment manifest for Railway
    const manifest = {
      deployment: 'admin-photos',
      timestamp: new Date().toISOString(),
      files: fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : []
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../static/uploads/admin-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('📋 Created deployment manifest');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

deployAdminPhotosToRailway()
  .then(() => {
    console.log('✅ Admin photos deployed to Railway successfully');
    console.log('\n🔄 Railway will auto-deploy these files on next push');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin photos deployment failed:', error);
    process.exit(1);
  });
