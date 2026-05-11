/**
 * Cloudinary Configuration
 * Configures and exports a single shared cloudinary instance.
 * Import this module wherever cloudinary is needed so all modules
 * share the same pre-configured instance.
 */
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

module.exports = cloudinary;
