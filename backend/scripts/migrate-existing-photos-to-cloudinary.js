require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { query } = require('../config/database');

async function migrateExistingPhotos() {
  console.log('🚀 Starting migration of existing photos to Cloudinary...');
  
  try {
    // Migrate school logo
    await migrateSchoolLogo();
    
    // Migrate school stamp
    await migrateSchoolStamp();
    
    // Migrate authority signature
    await migrateAuthoritySignature();
    
    // Migrate patron saint image
    await migratePatronSaintImage();
    
    // Migrate gallery photos
    await migrateGalleryPhotos();
    
    // Migrate administrator photos
    await migrateAdministratorPhotos();
    
    // Migrate staff profile photos
    await migrateStaffProfilePhotos();
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function migrateSchoolLogo() {
  console.log('📄 Migrating school logo...');
  
  const uploadDir = path.join(__dirname, '../static/uploads');
  
  try {
    const result = await query('SELECT * FROM school_logo WHERE id = 1');
    if (result.rows.length === 0) return;
    
    const logo = result.rows[0];
    if (logo.cloudinary_public_id) {
      console.log('✅ School logo already migrated to Cloudinary');
      return;
    }
    
    if (logo.logo_image_path && logo.logo_image_path.startsWith('/static/uploads/')) {
      const filename = path.basename(logo.logo_image_path);
      const filePath = path.join(uploadDir, filename);
      
      try {
        await fs.access(filePath);
        
        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
          folder: 'school-logos',
          public_id: `school-logo-${Date.now()}`
        });
        
        await query(
          'UPDATE school_logo SET logo_image_path = $1, cloudinary_public_id = $2 WHERE id = 1',
          [cloudinaryResult.secure_url, cloudinaryResult.public_id]
        );
        
        console.log(`✅ School logo migrated: ${filename} → ${cloudinaryResult.public_id}`);
      } catch (err) {
        console.warn(`⚠️  School logo file not found: ${filename}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  School logo migration failed:', error.message);
  }
}

async function migrateSchoolStamp() {
  console.log('📄 Migrating school stamp...');
  
  const uploadDir = path.join(__dirname, '../static/uploads');
  
  try {
    const result = await query('SELECT * FROM school_stamp WHERE id = 1');
    if (result.rows.length === 0) return;
    
    const stamp = result.rows[0];
    if (stamp.cloudinary_public_id) {
      console.log('✅ School stamp already migrated to Cloudinary');
      return;
    }
    
    if (stamp.stamp_image_path && stamp.stamp_image_path.startsWith('/static/uploads/')) {
      const filename = path.basename(stamp.stamp_image_path);
      const filePath = path.join(uploadDir, filename);
      
      try {
        await fs.access(filePath);
        
        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
          folder: 'school-logos',
          public_id: `school-stamp-${Date.now()}`
        });
        
        await query(
          'UPDATE school_stamp SET stamp_image_path = $1, cloudinary_public_id = $2 WHERE id = 1',
          [cloudinaryResult.secure_url, cloudinaryResult.public_id]
        );
        
        console.log(`✅ School stamp migrated: ${filename} → ${cloudinaryResult.public_id}`);
      } catch (err) {
        console.warn(`⚠️  School stamp file not found: ${filename}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  School stamp migration failed:', error.message);
  }
}

async function migrateAuthoritySignature() {
  console.log('📄 Migrating authority signature...');
  
  const uploadDir = path.join(__dirname, '../static/uploads');
  
  try {
    const result = await query('SELECT * FROM authority_data WHERE id = 1');
    if (result.rows.length === 0) return;
    
    const authority = result.rows[0];
    if (authority.cloudinary_public_id) {
      console.log('✅ Authority signature already migrated to Cloudinary');
      return;
    }
    
    if (authority.signature && authority.signature.startsWith('/static/uploads/')) {
      const filename = path.basename(authority.signature);
      const filePath = path.join(uploadDir, filename);
      
      try {
        await fs.access(filePath);
        
        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
          folder: 'authority-signatures',
          public_id: `authority-signature-${Date.now()}`
        });
        
        await query(
          'UPDATE authority_data SET signature = $1, cloudinary_public_id = $2 WHERE id = 1',
          [cloudinaryResult.secure_url, cloudinaryResult.public_id]
        );
        
        console.log(`✅ Authority signature migrated: ${filename} → ${cloudinaryResult.public_id}`);
      } catch (err) {
        console.warn(`⚠️  Authority signature file not found: ${filename}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Authority signature migration failed:', error.message);
  }
}

async function migratePatronSaintImage() {
  console.log('📄 Migrating patron saint image...');
  
  const uploadDir = path.join(__dirname, '../static/uploads');
  
  try {
    const result = await query('SELECT * FROM website_settings WHERE id = 1');
    if (result.rows.length === 0) return;
    
    const settings = result.rows[0];
    if (settings.patron_saint_cloudinary_public_id) {
      console.log('✅ Patron saint image already migrated to Cloudinary');
      return;
    }
    
    if (settings.patron_saint_image && settings.patron_saint_image.startsWith('/static/uploads/')) {
      const filename = path.basename(settings.patron_saint_image);
      const filePath = path.join(uploadDir, filename);
      
      try {
        await fs.access(filePath);
        
        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
          folder: 'patron-saint-images',
          public_id: `patron-saint-${Date.now()}`
        });
        
        await query(
          'UPDATE website_settings SET patron_saint_image = $1, patron_saint_cloudinary_public_id = $2 WHERE id = 1',
          [cloudinaryResult.secure_url, cloudinaryResult.public_id]
        );
        
        console.log(`✅ Patron saint image migrated: ${filename} → ${cloudinaryResult.public_id}`);
      } catch (err) {
        console.warn(`⚠️  Patron saint image file not found: ${filename}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Patron saint image migration failed:', error.message);
  }
}

async function migrateGalleryPhotos() {
  console.log('📸 Migrating gallery photos...');
  
  const uploadDir = path.join(__dirname, '../static/uploads/gallery');
  
  try {
    const result = await query('SELECT * FROM gallery_photos WHERE cloudinary_public_id IS NULL');
    
    for (const photo of result.rows) {
      if (photo.photo_url && photo.photo_url.startsWith('/static/uploads/gallery/')) {
        const filename = path.basename(photo.photo_url);
        const filePath = path.join(uploadDir, filename);
        
        try {
          await fs.access(filePath);
          
          const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            folder: 'arucase-gallery',
            public_id: `gallery-${Date.now()}-${Math.round(Math.random() * 1E9)}`
          });
          
          await query(
            'UPDATE gallery_photos SET photo_url = $1, cloudinary_public_id = $2 WHERE id = $3',
            [cloudinaryResult.secure_url, cloudinaryResult.public_id, photo.id]
          );
          
          console.log(`✅ Gallery photo migrated: ${filename} → ${cloudinaryResult.public_id}`);
        } catch (err) {
          console.warn(`⚠️  Gallery photo file not found: ${filename}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Gallery photos migration failed:', error.message);
  }
}

async function migrateAdministratorPhotos() {
  console.log('👤 Migrating administrator photos...');
  
  const uploadDir = path.join(__dirname, '../static/uploads/admin-photos');
  
  try {
    const result = await query('SELECT * FROM administrators WHERE cloudinary_public_id IS NULL AND photo IS NOT NULL');
    
    for (const admin of result.rows) {
      if (admin.photo && admin.photo.startsWith('/static/uploads/admin-photos/')) {
        const filename = path.basename(admin.photo);
        const filePath = path.join(uploadDir, filename);
        
        try {
          await fs.access(filePath);
          
          const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            folder: 'admin-photos',
            public_id: `admin-${admin.id}-${Date.now()}`
          });
          
          await query(
            'UPDATE administrators SET photo = $1, cloudinary_public_id = $2 WHERE id = $3',
            [cloudinaryResult.secure_url, cloudinaryResult.public_id, admin.id]
          );
          
          console.log(`✅ Administrator photo migrated: ${filename} → ${cloudinaryResult.public_id}`);
        } catch (err) {
          console.warn(`⚠️  Administrator photo file not found: ${filename}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Administrator photos migration failed:', error.message);
  }
}

async function migrateStaffProfilePhotos() {
  console.log('👨‍🏫 Migrating staff profile photos...');
  
  const uploadDir = path.join(__dirname, '../static/uploads/staff-photos');
  
  try {
    const result = await query('SELECT * FROM staff_profiles WHERE cloudinary_public_id IS NULL AND photo_path IS NOT NULL');
    
    for (const staff of result.rows) {
      if (staff.photo_path && staff.photo_path.startsWith('/static/uploads/staff-photos/')) {
        const filename = path.basename(staff.photo_path);
        const filePath = path.join(uploadDir, filename);
        
        try {
          await fs.access(filePath);
          
          const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            folder: 'staff-photos',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto:good', fetch_format: 'auto' }
            ],
            public_id: `staff-${staff.id}-${Date.now()}`
          });
          
          await query(
            'UPDATE staff_profiles SET photo_path = $1, cloudinary_public_id = $2 WHERE id = $3',
            [cloudinaryResult.secure_url, cloudinaryResult.public_id, staff.id]
          );
          
          console.log(`✅ Staff profile photo migrated: ${filename} → ${cloudinaryResult.public_id}`);
        } catch (err) {
          console.warn(`⚠️  Staff profile photo file not found: ${filename}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Staff profile photos migration failed:', error.message);
  }
}

// Run migration
migrateExistingPhotos();
