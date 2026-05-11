/**
 * Cloudinary Configuration
 * Configures and exports a single shared cloudinary instance.
 * Import this module wherever cloudinary is needed so all modules
 * share the same pre-configured instance.
 *
 * IMPORTANT: multer-storage-cloudinary v2.x expects the full cloudinary
 * module (require('cloudinary')), not the v2 sub-object, because it
 * internally accesses cloudinary.v2.uploader. Use `cloudinaryModule` when
 * constructing CloudinaryStorage instances and `cloudinary` (the v2 object)
 * for direct API calls (upload, destroy, etc.).
 */
require('dotenv').config();

const REQUIRED_VARS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(
    `[cloudinary] WARNING: Missing environment variable(s): ${missingVars.join(', ')}. ` +
    'Photo uploads will fail until these are set.'
  );
} else {
  console.log(`[cloudinary] Configured for cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
}

// Full cloudinary module — required by multer-storage-cloudinary v2.x which
// internally accesses cloudinary.v2.uploader.
const cloudinaryModule = require('cloudinary');

// Pre-configured v2 instance — use this for direct API calls.
const cloudinary = cloudinaryModule.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Returns true when all required Cloudinary env vars are present and the
 * v2 uploader object is available.
 */
function isCloudinaryConfigured() {
  return missingVars.length === 0 && typeof cloudinary.uploader !== 'undefined';
}

// Default export is the v2 instance (backwards-compatible with existing callers).
// The full module and the helper are available as named properties.
cloudinary.cloudinaryModule = cloudinaryModule;
cloudinary.isCloudinaryConfigured = isCloudinaryConfigured;

module.exports = cloudinary;
