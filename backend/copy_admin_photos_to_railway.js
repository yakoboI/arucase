const fs = require('fs');
const path = require('path');

async function copyAdminPhotosToRailway() {
  console.log('📸 Copying admin photos to Railway deployment directory...');
  
  try {
    const sourceDir = 'C:\\Users\\Admin\\Desktop\\arucase456\\backend\\static\\uploads\\administrators';
    const targetDir = 'C:\\Users\\Admin\\Desktop\\arucase456\\backend\\static\\uploads\\administrators';
    
    console.log(`📁 Source: ${sourceDir}`);
    console.log(`📁 Target: ${targetDir}`);
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('📁 Created target directory');
    }
    
    // List source files
    const sourceFiles = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir) : [];
    console.log(`📸 Found ${sourceFiles.length} admin photos in source:`);
    sourceFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
    // Copy files
    let copiedCount = 0;
    for (const file of sourceFiles) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ Copied: ${file}`);
        copiedCount++;
      } catch (error) {
        console.log(`❌ Failed to copy ${file}: ${error.message}`);
      }
    }
    
    // Verify
    const targetFiles = fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : [];
    console.log(`\n📊 Summary:`);
    console.log(`  - Files copied: ${copiedCount}`);
    console.log(`  - Files in target: ${targetFiles.length}`);
    
    console.log(`\n📁 Files in Railway deployment directory:`);
    targetFiles.forEach((file, index) => {
      const filePath = path.join(targetDir, file);
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      console.log(`  ${index + 1}. ${file} (${stats ? (stats.size / 1024).toFixed(1) + 'KB' : 'N/A'})`);
    });
    
    // Create deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      files: targetFiles,
      size: targetFiles.length
    };
    
    fs.writeFileSync(
      path.join(targetDir, 'deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('\n📋 Created deployment-info.json');
    
  } catch (error) {
    console.error('❌ Error copying admin photos:', error);
    throw error;
  }
}

copyAdminPhotosToRailway()
  .then(() => {
    console.log('\n✅ Admin photos copied to Railway deployment directory');
    console.log('🔄 These files will be deployed to Railway production');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Copy operation failed:', error);
    process.exit(1);
  });
