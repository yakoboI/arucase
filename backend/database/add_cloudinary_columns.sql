-- Add Cloudinary public_id columns to all photo tables
-- This enables tracking and deletion of Cloudinary assets

-- School logo table
ALTER TABLE school_logo ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- School stamp table  
ALTER TABLE school_stamp ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- Authority data table (for signature)
ALTER TABLE authority_data ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- Website settings table (for patron saint image)
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS patron_saint_cloudinary_public_id VARCHAR(255);

-- Gallery photos table
ALTER TABLE gallery_photos ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- Administrators table (already exists but ensure it's there)
ALTER TABLE administrators ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- Staff profiles table (already exists but ensure it's there)
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- Student photos table (already exists but ensure it's there)
ALTER TABLE student_photos ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_logo_cloudinary ON school_logo(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_school_stamp_cloudinary ON school_stamp(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_authority_data_cloudinary ON authority_data(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_website_settings_patron_cloudinary ON website_settings(patron_saint_cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_cloudinary ON gallery_photos(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_administrators_cloudinary ON administrators(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_cloudinary ON staff_profiles(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_cloudinary ON student_photos(cloudinary_public_id);
