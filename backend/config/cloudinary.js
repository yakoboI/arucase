/**
 * Cloudinary Configuration
 * Configures and exports a single shared cloudinary instance.
 * Import this module wherever cloudinary is needed so all modules
 * share the same pre-configured instance.
 *
 * Use `cloudinary` (the v2 object) for direct API calls (upload, destroy, etc.).
 * Use `createCloudinaryStorage` to build multer storage engines that stream
 * files to Cloudinary via `cloudinary.uploader.upload_stream()` — the correct
 * v2 API that guarantees the callback is always invoked.
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

// Full cloudinary module — kept for backwards compatibility with any callers
// that still reference cloudinary.cloudinaryModule.
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

/**
 * Creates a custom multer storage engine that uploads directly to Cloudinary
 * using `cloudinary.uploader.upload_stream()` — the correct v2 streaming API.
 *
 * This bypasses `multer-storage-cloudinary` entirely, which avoids the known
 * issue where the library's internal `cloudinary.uploader.upload()` callback
 * is never invoked when used with the cloudinary v2 SDK.
 *
 * @param {object} options
 * @param {string}          options.folder          - Cloudinary folder name
 * @param {string[]}        options.allowed_formats - Permitted file extensions
 * @param {object[]|null}   options.transformation  - Cloudinary transformation array (optional)
 * @param {Function}        options.publicId        - (req, file) => string — generates the public_id
 * @param {number}          [options.timeoutMs=55000] - Per-upload timeout in ms
 * @param {string}          [options.label='cloudinary'] - Log prefix
 * @returns {object} A multer-compatible storage engine
 */
function createCloudinaryStorage({
  folder,
  allowed_formats,
  transformation,
  publicId,
  timeoutMs = 55000,
  label = 'cloudinary',
}) {
  return {
    _handleFile(req, file, cb) {
      const public_id = publicId(req, file);
      console.log(`[${label}] upload_stream starting — folder: ${folder}, public_id: ${public_id}`);

      let settled = false;
      function settle(err, result) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err) {
          console.error(`[${label}] upload_stream error:`, err);
          return cb(err);
        }
        console.log(`[${label}] upload_stream success — public_id: ${result.public_id}, url: ${result.secure_url}`);
        cb(null, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          // Match the shape that multer-storage-cloudinary produces so
          // downstream route handlers can read req.file.path and req.file.filename
          // without any changes.
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
        });
      }

      const timer = setTimeout(() => {
        settle(new Error(`Cloudinary upload_stream timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      const uploadParams = { folder, public_id };
      if (allowed_formats && allowed_formats.length) {
        uploadParams.allowed_formats = allowed_formats;
      }
      if (transformation && transformation.length) {
        uploadParams.transformation = transformation;
      }

      let stream;
      try {
        stream = cloudinary.uploader.upload_stream(uploadParams, (err, result) => {
          if (err) return settle(err);
          if (!result) return settle(new Error('Cloudinary returned no result'));
          settle(null, result);
        });
      } catch (err) {
        return settle(err);
      }

      stream.on('error', (err) => settle(err));
      file.stream.pipe(stream);
    },

    _removeFile(req, file, cb) {
      if (file.filename) {
        cloudinary.uploader.destroy(file.filename, (err) => {
          if (err) console.warn(`[${label}] _removeFile destroy error:`, err);
          cb(null);
        });
      } else {
        cb(null);
      }
    },
  };
}

// Default export is the v2 instance (backwards-compatible with existing callers).
// The full module and the helper are available as named properties.
cloudinary.cloudinaryModule = cloudinaryModule;
cloudinary.isCloudinaryConfigured = isCloudinaryConfigured;
cloudinary.createCloudinaryStorage = createCloudinaryStorage;

module.exports = cloudinary;
