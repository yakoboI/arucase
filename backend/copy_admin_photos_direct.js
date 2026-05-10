const fs = require('fs');
const path = require('path');

// Direct copy using absolute paths
async function copyAdminPhotosDirect() {
  console.log('📸 Direct copy of administrator photos...');
  
  try {
    const sourceDir = 'C:\\Users\\Admin\\Desktop\\arucase456\\backend\\static\\uploads\\administrators';
    const targetDir = 'C:\\Users\\Admin\\Desktop\\arucase456\\backend\\static\\uploads\\administrators';
    
    console.log(`📁 Source directory: ${sourceDir}`);
    console.log(`📁 Target directory: ${targetDir}`);
    
    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.log('❌ Source directory does not exist');
      return;
    }
    
    // List files in source directory
    const files = fs.readdirSync(sourceDir);
    console.log(`📸 Found ${files.length} files in source directory:`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('📁 Created target directory');
    }
    
    // Copy files
    let copiedCount = 0;
    for (const file of files) {
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
    
    console.log(`\n📊 Summary: Copied ${copiedCount} files`);
    
  } catch (error) {
    console.error('❌ Error copying admin photos:', error);
  }
}

copyAdminPhotosDirect();
