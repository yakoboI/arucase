/**
 * User profile photo (sidebar passport) — Cloudinary upload + DB helpers
 */
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { query } = require('../config/database');

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 60_000;

let _storage = null;

function getUserProfilePhotoStorage() {
  if (!_storage) {
    if (!cloudinary.isCloudinaryConfigured()) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      );
    }
    _storage = cloudinary.createCloudinaryStorage({
      folder: 'user-profile-photos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 300, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
      publicId: () => `user-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      label: 'USER PROFILE PHOTO',
    });
  }
  return _storage;
}

function runUpload(multerFn, req, res, next) {
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    if (!res.headersSent) {
      res.status(504).json({ message: 'Upload timed out. Please try again.' });
    }
  }, CLOUDINARY_UPLOAD_TIMEOUT_MS);

  multerFn()(req, res, (err) => {
    clearTimeout(timer);
    if (timedOut) return;
    if (err) {
      if (res.headersSent) return;
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ message: err.message || 'Upload failed' });
    }
    req.file =
      (req.files?.photo?.[0]) ||
      (req.files?.photo_file?.[0]) ||
      (req.files?.file?.[0]) ||
      req.file ||
      null;
    next();
  });
}

const userProfilePhotoUpload = (req, res, next) => {
  let storage;
  try {
    storage = getUserProfilePhotoStorage();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  const imageFilter = (_req, file, cb) => {
    const ok =
      /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase()) &&
      /jpeg|jpg|png|webp/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only JPG, PNG, or WebP images are allowed'));
  };

  runUpload(
    () =>
      multer({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: imageFilter,
      }).fields([
        { name: 'photo', maxCount: 1 },
        { name: 'photo_file', maxCount: 1 },
        { name: 'file', maxCount: 1 },
      ]),
    req,
    res,
    next
  );
};

async function ensureUserProfilePhotoColumns() {
  await query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_cloudinary_id VARCHAR(255)`
  );
}

async function removeStoredUserProfilePhoto(row) {
  if (!row) return;
  const publicId = row.profile_picture_cloudinary_id;
  const picture = row.profile_picture;

  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      /* ignore */
    }
    return;
  }

  if (picture && !String(picture).startsWith('http')) {
    try {
      const filePath = path.join(__dirname, '../static', picture);
      await fs.unlink(filePath);
    } catch {
      /* ignore */
    }
  }
}

function userHasProfilePhoto(row) {
  return Boolean(row?.profile_picture && String(row.profile_picture).trim());
}

module.exports = {
  ensureUserProfilePhotoColumns,
  userProfilePhotoUpload,
  removeStoredUserProfilePhoto,
  userHasProfilePhoto,
};
