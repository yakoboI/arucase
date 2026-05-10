const cloudinary = require('cloudinary').v2;

async function testCloudinaryConnection() {
  console.log('🔍 Testing Cloudinary connection...');
  
  try {
    // Check environment variables
    console.log('📋 Environment variables:');
    console.log(`  CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET'}`);
    console.log(`  CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`  CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET'}`);
    
    // Configure Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      
      console.log('✅ Cloudinary configured');
      
      // Test connection
      const result = await cloudinary.api.ping();
      console.log('✅ Cloudinary connection successful');
      console.log(`   Result: ${result}`);
      
      // Test upload with a simple image
      console.log('\n📸 Testing admin photo upload...');
      
      // Create a simple test image buffer
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const uploadResult = await cloudinary.uploader.upload(testImage, {
        folder: 'administrator-photos',
        public_id: 'test-admin-photo',
        overwrite: true
      });
      
      console.log(`✅ Test upload successful`);
      console.log(`   URL: ${uploadResult.secure_url}`);
      console.log(`   Public ID: ${uploadResult.public_id}`);
      
      // Clean up test image
      await cloudinary.uploader.destroy('test-admin-photo');
      console.log('🗑️  Cleaned up test image');
      
    } else {
      console.log('❌ Cloudinary credentials not configured');
      console.log('⚠️  Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
  }
}

testCloudinaryConnection();
