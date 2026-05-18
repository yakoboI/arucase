/**
 * Admin Routes - Full Functionality
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { cacheRoutes, clearCachePattern } = require('../middleware/cache');
const { saveUserActivity } = require('../utils/activityLogger');
const bcrypt = require('bcryptjs');
const { extractText } = require('../utils/documentParser');
const { getClient, callClaude } = require('../utils/anthropic');
const { getNectaSummaryForAI } = require('../utils/nectaAnalyticsForAI');
const { sendError } = require('../utils/safeError');
const cloudinary = require('../config/cloudinary');
const {
  syncPhotoFromStaffProfileToUser,
  clearUserPhotoForUsername,
  pullUserPhotoIntoStaffProfile,
} = require('../utils/staffUserPhotoSync');
const { PUBLIC_PAGE_SLUG_ALIASES } = require('../utils/publicPageSlugs');
// createCloudinaryStorage uses cloudinary.uploader.upload_stream() directly,
// bypassing multer-storage-cloudinary whose upload() callback was never invoked
// with the cloudinary v2 SDK (causing 60 s upload timeouts).
const { createCloudinaryStorage } = cloudinary;

// Validate that cloudinary is properly configured before creating storage instances
function assertCloudinaryConfigured() {
  if (!cloudinary.isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not properly initialized. ' +
      'Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
    );
  }
}

// Lazy storage factories — instances are created on first upload request,
// not at module load time. This ensures cloudinary.uploader is available and env
// vars have been loaded before the storage engine tries to access them.
//
// All storage engines use createCloudinaryStorage() which calls
// cloudinary.uploader.upload_stream() directly — the correct v2 streaming API.
// This replaces multer-storage-cloudinary whose internal upload() callback was
// never invoked when used with the cloudinary v2 SDK, causing 60 s timeouts.

let _staffPhotoStorage = null;
function getStaffPhotoStorage() {
  if (!_staffPhotoStorage) {
    assertCloudinaryConfigured();
    console.log('[cloudinary] Creating staffPhotoStorage instance');
    _staffPhotoStorage = createCloudinaryStorage({
      folder: 'staff-photos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
      publicId: () => `staff-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
      label: 'STAFF PHOTO storage',
    });
  }
  return _staffPhotoStorage;
}

let _schoolLogoStorage = null;
function getSchoolLogoStorage() {
  if (!_schoolLogoStorage) {
    assertCloudinaryConfigured();
    console.log('[cloudinary] Creating schoolLogoStorage instance');
    _schoolLogoStorage = createCloudinaryStorage({
      folder: 'school-logos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      publicId: () => `school-logo-${Date.now()}`,
      label: 'SCHOOL LOGO storage',
    });
  }
  return _schoolLogoStorage;
}

let _schoolStampStorage = null;
function getSchoolStampStorage() {
  if (!_schoolStampStorage) {
    assertCloudinaryConfigured();
    console.log('[cloudinary] Creating schoolStampStorage instance');
    _schoolStampStorage = createCloudinaryStorage({
      folder: 'school-logos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      publicId: () => `school-stamp-${Date.now()}`,
      label: 'SCHOOL STAMP storage',
    });
  }
  return _schoolStampStorage;
}

let _authoritySignatureStorage = null;
function getAuthoritySignatureStorage() {
  if (!_authoritySignatureStorage) {
    assertCloudinaryConfigured();
    console.log('[cloudinary] Creating authoritySignatureStorage instance');
    _authoritySignatureStorage = createCloudinaryStorage({
      folder: 'authority-signatures',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      publicId: () => `authority-signature-${Date.now()}`,
      label: 'AUTHORITY SIGNATURE storage',
    });
  }
  return _authoritySignatureStorage;
}

let _patronSaintStorage = null;
function getPatronSaintStorage() {
  if (!_patronSaintStorage) {
    assertCloudinaryConfigured();
    console.log('[cloudinary] Creating patronSaintStorage instance');
    _patronSaintStorage = createCloudinaryStorage({
      folder: 'patron-saint-images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      publicId: () => `patron-saint-${Date.now()}`,
      label: 'PATRON SAINT storage',
    });
  }
  return _patronSaintStorage;
}

let _galleryPhotoStorage = null;
function getGalleryPhotoStorage() {
  if (!_galleryPhotoStorage) {
    assertCloudinaryConfigured();
    console.log('[cloudinary] Creating galleryPhotoStorage instance');
    _galleryPhotoStorage = createCloudinaryStorage({
      folder: 'arucase-gallery',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      publicId: () => `gallery-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
      label: 'GALLERY PHOTO storage',
    });
  }
  return _galleryPhotoStorage;
}

// All admin routes require authentication
router.use(requireAuth);

async function ensureAdmissionsTables() {
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await query(`
    CREATE TABLE IF NOT EXISTS admission_applicants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS admission_applications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      applicant_id UUID NOT NULL REFERENCES admission_applicants(id) ON DELETE CASCADE,
      education_level VARCHAR(50) NOT NULL,
      is_transfer BOOLEAN DEFAULT FALSE,
      previous_school VARCHAR(255),
      desired_entry VARCHAR(100) NOT NULL,
      region VARCHAR(100),
      district VARCHAR(100),
      message TEXT,
      documents JSONB,
      status VARCHAR(50) DEFAULT 'pending',
      admin_feedback TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate older schema (single application per applicant) -> allow multiple
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'admission_applications'::regclass
          AND contype = 'u'
          AND conname = 'admission_applications_applicant_id_key'
      ) THEN
        ALTER TABLE admission_applications DROP CONSTRAINT admission_applications_applicant_id_key;
      END IF;
    END $$;
  `);

  await query(`ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS application_no INTEGER DEFAULT 1`);
  await query(`ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS is_reapplication BOOLEAN DEFAULT FALSE`);
  await query(`ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS previous_application_id UUID`);

  await query(`CREATE INDEX IF NOT EXISTS idx_admission_applications_applicant ON admission_applications(applicant_id, submitted_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON admission_applications(status)`);
}

let staffProfilesTableReadyPromise = null;
async function ensureStaffProfilesTable() {
  if (staffProfilesTableReadyPromise) {
    return staffProfilesTableReadyPromise;
  }

  staffProfilesTableReadyPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS staff_profiles (
        id VARCHAR(100) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        role_title VARCHAR(255) NOT NULL,
        is_teaching BOOLEAN DEFAULT TRUE,
        professional_subjects TEXT,
        teaching_since_year INTEGER,
        subjects_teaching TEXT,
        class_teacher_for VARCHAR(100),
        other_duties TEXT,
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        photo_path VARCHAR(255),
        profile_summary TEXT,
        display_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Backfill missing columns if table existed before this feature landed.
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS role_title VARCHAR(255)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS is_teaching BOOLEAN DEFAULT TRUE`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS professional_subjects TEXT`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS teaching_since_year INTEGER`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS subjects_teaching TEXT`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS class_teacher_for VARCHAR(100)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS other_duties TEXT`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS photo_path VARCHAR(255)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS profile_summary TEXT`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS linked_username VARCHAR(100)`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_profiles_linked_username
      ON staff_profiles (linked_username)
      WHERE linked_username IS NOT NULL AND linked_username <> ''
    `);

    await query('CREATE INDEX IF NOT EXISTS idx_staff_profiles_active_order ON staff_profiles(active, display_order, created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_staff_profiles_teaching ON staff_profiles(is_teaching, active)');
  })().catch((error) => {
    // Allow retry on next request when initialization fails.
    staffProfilesTableReadyPromise = null;
    throw error;
  });

  return staffProfilesTableReadyPromise;
}

// ========== ADMISSIONS APPLICATIONS (ADMIN REVIEW) ==========

router.get('/admission-applications', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status && ['pending', 'approved', 'rejected'].includes((status + '').toLowerCase())) {
      params.push((status + '').toLowerCase());
      where = `WHERE a.status = $${params.length}`;
    }
    const r = await query(
      `SELECT 
        a.*,
        ap.full_name,
        ap.email,
        ap.phone
       FROM admission_applications a
       JOIN admission_applicants ap ON ap.id = a.applicant_id
       ${where}
       ORDER BY a.submitted_at DESC`,
      params
    );
    res.json({ applications: r.rows || [] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

router.post('/admission-applications/:id/status', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const { id } = req.params;
    const { status, feedback = null } = req.body || {};
    const st = (status || '').toString().trim().toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(st)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const upd = await query(
      `UPDATE admission_applications
       SET status = $1, admin_feedback = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [st, feedback, id]
    );
    if (upd.rows.length === 0) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Status updated', application: upd.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

router.delete('/admission-applications/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const { id } = req.params;
    await query(
      `UPDATE admission_applications SET previous_application_id = NULL WHERE previous_application_id = $1`,
      [id]
    );
    const del = await query(`DELETE FROM admission_applications WHERE id = $1 RETURNING id`, [id]);
    if (del.rows.length === 0) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Application deleted', id: del.rows[0].id });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Configure multer for file uploads (for non-photo uploads)
// Use sync fs operations for multer destination to avoid async issues
const fsSync = require('fs');

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '../static/uploads');
      // Create directory asynchronously for Multer 2.x compatibility
      await fsSync.promises.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      console.error('Error creating upload directory:', err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 16MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper: build a multer instance backed by a lazy Cloudinary storage factory.
// The storage instance is created on first use so that cloudinary.uploader is
// guaranteed to be available (env vars loaded) before the storage engine
// tries to access it.
function makeCloudinaryUpload(getStorage, fileSizeLimit) {
  const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  };

  return (req, res, next) => {
    let storage;
    try {
      storage = getStorage();
    } catch (err) {
      console.error('[cloudinary] Storage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    multer({ storage, limits: { fileSize: fileSizeLimit }, fileFilter: imageFilter })
      .single('file')(req, res, next);
  };
}

// Upload timeout in milliseconds — if Cloudinary does not respond within this
// window the middleware aborts with a 504 so the request does not hang forever.
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 60_000; // 60 s

/**
 * Wrap a multer call with:
 *  - pre-upload logging (file received from client)
 *  - an explicit error callback so Cloudinary/multer errors are never swallowed
 *  - a timeout guard that returns 504 if Cloudinary stalls
 *  - post-upload logging (file path / public_id from Cloudinary)
 *
 * @param {string}   label    - human-readable name used in log lines
 * @param {Function} multerFn - zero-arg factory that returns the bound multer
 *                              method (e.g. `() => multer({...}).single(field)`)
 * @param {object}   req
 * @param {object}   res
 * @param {Function} next
 */
function runCloudinaryUpload(label, multerFn, req, res, next) {
  console.log(`[${label}] File received from client, starting Cloudinary upload…`);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    console.error(`[${label}] ❌ Upload timed out after ${CLOUDINARY_UPLOAD_TIMEOUT_MS / 1000}s — Cloudinary did not respond`);
    if (!res.headersSent) {
      res.status(504).json({ message: 'Upload timed out. Cloudinary did not respond in time.' });
    }
  }, CLOUDINARY_UPLOAD_TIMEOUT_MS);

  multerFn()(req, res, (err) => {
    clearTimeout(timer);
    if (timedOut) return; // response already sent

    if (err) {
      console.error(`[${label}] ❌ Multer/Cloudinary error:`, err);
      if (res.headersSent) return;
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ message: `Upload failed: ${err.message}` });
    }

    // Log what Cloudinary returned so we can see exactly where things stand
    const uploadedFile = req.file || (req.files && (
      (req.files.photo && req.files.photo[0]) ||
      (req.files.photo_file && req.files.photo_file[0]) ||
      (req.files.file && req.files.file[0])
    ));
    if (uploadedFile) {
      console.log(`[${label}] ✅ Cloudinary upload complete — public_id: ${uploadedFile.filename}, url: ${uploadedFile.path}`);
    } else {
      console.log(`[${label}] ⚠️  Multer finished but no file found on req.file / req.files`);
    }

    next();
  });
}

// Multer middleware for each upload type (lazy — storage created on first request)
const schoolLogoUpload = {
  single: (field) => (req, res, next) => {
    let storage;
    try { storage = getSchoolLogoStorage(); } catch (err) {
      console.error('[cloudinary] schoolLogoStorage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    const imageFilter = (req, file, cb) => {
      const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
               && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    };
    runCloudinaryUpload(
      'SCHOOL LOGO',
      () => multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single(field),
      req, res, next
    );
  }
};

const schoolStampUpload = {
  single: (field) => (req, res, next) => {
    let storage;
    try { storage = getSchoolStampStorage(); } catch (err) {
      console.error('[cloudinary] schoolStampStorage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    const imageFilter = (req, file, cb) => {
      const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
               && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    };
    runCloudinaryUpload(
      'SCHOOL STAMP',
      () => multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single(field),
      req, res, next
    );
  }
};

const authoritySignatureUpload = {
  single: (field) => (req, res, next) => {
    let storage;
    try { storage = getAuthoritySignatureStorage(); } catch (err) {
      console.error('[cloudinary] authoritySignatureStorage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    const imageFilter = (req, file, cb) => {
      const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
               && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    };
    runCloudinaryUpload(
      'AUTHORITY SIGNATURE',
      () => multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single(field),
      req, res, next
    );
  }
};

const patronSaintUpload = {
  single: (field) => (req, res, next) => {
    let storage;
    try { storage = getPatronSaintStorage(); } catch (err) {
      console.error('[cloudinary] patronSaintStorage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    const imageFilter = (req, file, cb) => {
      const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
               && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    };
    runCloudinaryUpload(
      'PATRON SAINT',
      () => multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single(field),
      req, res, next
    );
  }
};

const galleryPhotoUpload = {
  single: (field) => (req, res, next) => {
    let storage;
    try { storage = getGalleryPhotoStorage(); } catch (err) {
      console.error('[cloudinary] galleryPhotoStorage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    const imageFilter = (req, file, cb) => {
      const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
               && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    };
    runCloudinaryUpload(
      'GALLERY PHOTO',
      () => multer({ storage, limits: { fileSize: 16 * 1024 * 1024 }, fileFilter: imageFilter }).single(field),
      req, res, next
    );
  },
  array: (field, maxCount) => (req, res, next) => {
    let storage;
    try { storage = getGalleryPhotoStorage(); } catch (err) {
      console.error('[cloudinary] galleryPhotoStorage init failed:', err.message);
      return res.status(500).json({ message: err.message });
    }
    const imageFilter = (req, file, cb) => {
      const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
               && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
      ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
    };
    runCloudinaryUpload(
      'GALLERY PHOTOS (array)',
      () => multer({ storage, limits: { fileSize: 16 * 1024 * 1024 }, fileFilter: imageFilter }).array(field, maxCount),
      req, res, next
    );
  }
};

// Staff profile upload: accept common field-name variants to avoid Multer "Unexpected field"
const staffProfileUpload = (req, res, next) => {
  let storage;
  try {
    storage = getStaffPhotoStorage();
  } catch (err) {
    console.error('[cloudinary] staffPhotoStorage init failed:', err.message);
    return res.status(500).json({ message: err.message });
  }

  const imageFilter = (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
             && /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  };

  runCloudinaryUpload(
    'STAFF PHOTO',
    () => multer({
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFilter,
    }).fields([
      { name: 'photo', maxCount: 1 },
      { name: 'photo_file', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
    req, res, (err) => {
      if (err) return next(err);
      // Normalize file reference to req.file for downstream handlers
      req.file = (req.files && req.files.photo && req.files.photo[0])
        || (req.files && req.files.photo_file && req.files.photo_file[0])
        || (req.files && req.files.file && req.files.file[0])
        || null;
      next();
    }
  );
};

// AI Matters: document uploads (PDF, CSV, DOCX)
const aiMattersPath = path.join(__dirname, '../static/ai-matters');
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fsSync.mkdirSync(aiMattersPath, { recursive: true });
      cb(null, aiMattersPath);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    if (['.pdf', '.csv', '.docx', '.doc'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, CSV, and Word (.docx/.doc) files are allowed'));
    }
  }
});

// ========== DASHBOARD STATISTICS ==========

// Get dashboard statistics
router.get('/dashboard/stats', cacheRoutes.dashboardStats, async (req, res) => {
  try {
    const userRole = req.user?.role || 'teacher';
    const isAdmin = ['admin', 'superadmin', 'rector', 'vice_rector', 'academic_master'].includes(userRole);
    
    const stats = {
      students_by_year: [],
      students_by_year_and_form: [],
    };
    
    // Only calculate stats for admin users
    if (isAdmin) {
      // Per-year student counts (for year summary: 2025=56, 2026=55, ...)
      // Group by year and term to distinguish First Term vs Second Term students
      const studentsByYearResult = await query(`
        SELECT year, term, COUNT(*) as count
        FROM students
        GROUP BY year, term
        ORDER BY year DESC, term DESC
      `);
      if (studentsByYearResult.rows.length > 0) {
        stats.students_by_year = studentsByYearResult.rows.map(row => ({
          year: parseInt(row.year) || 0,
          term: row.term || 'First Term',
          count: parseInt(row.count) || 0
        }));
      }

      // Per-year, per-form student counts (for detailed form/year distribution)
      // Group by year and term to distinguish First Term vs Second Term students
      const studentsByYearAndFormResult = await query(`
        SELECT 
          year,
          term,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM I' THEN 1 ELSE 0 END) AS form_i,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM II' THEN 1 ELSE 0 END) AS form_ii,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM III' THEN 1 ELSE 0 END) AS form_iii,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM IV' THEN 1 ELSE 0 END) AS form_iv,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM V' THEN 1 ELSE 0 END) AS form_v,
          SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM VI' THEN 1 ELSE 0 END) AS form_vi
        FROM students
        GROUP BY year, term
        ORDER BY year DESC, term DESC
      `);
      if (studentsByYearAndFormResult.rows.length > 0) {
        stats.students_by_year_and_form = studentsByYearAndFormResult.rows.map(row => {
          const formI = parseInt(row.form_i) || 0;
          const formII = parseInt(row.form_ii) || 0;
          const formIII = parseInt(row.form_iii) || 0;
          const formIV = parseInt(row.form_iv) || 0;
          const formV = parseInt(row.form_v) || 0;
          const formVI = parseInt(row.form_vi) || 0;
          const total = formI + formII + formIII + formIV + formV + formVI;
          return {
            year: parseInt(row.year) || 0,
            term: row.term || 'First Term',
            form_i: formI,
            form_ii: formII,
            form_iii: formIII,
            form_iv: formIV,
            form_v: formV,
            form_vi: formVI,
            total
          };
        });
      }

    }
    
    // Log activity
    try {
      const username = req.user?.user_id || req.user?.username || 'unknown';
      if (username && username !== 'unknown') {
        await saveUserActivity({
          user_id: req.user.id,
          username: username,
          activity_type: 'page_view',
          description: 'Viewed dashboard',
          details: { page: 'dashboard', role: userRole }
        });
      }
    } catch (error) {
      console.error('Failed to log dashboard view:', error);
    }
    
    res.json({ 
      success: true, 
      stats,
      isAdmin 
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return sendError(res, error, 500);
  }
});

// ========== USER MANAGEMENT ==========

// Get all users (updated to include permissions)
router.get('/users', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, full_name, role, status, permissions, email, phone, 
       profile_picture, bio, department, position, created_at, updated_at 
       FROM users 
       WHERE UPPER(role) != 'SUPERADMIN' 
       ORDER BY created_at DESC`
    );
    
    // Parse permissions JSON with error handling
    const users = result.rows.map(user => {
      try {
        return {
          ...user,
          permissions: user.permissions ? JSON.parse(user.permissions) : null,
        };
      } catch (parseError) {
        console.error('Failed to parse permissions for user:', user.username, parseError);
        return {
          ...user,
          permissions: null,
        };
      }
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return sendError(res, error, 500);
  }
});

// Clear cache when users are created/updated
router.post('/users', requireRole('admin', 'superadmin'), async (req, res, next) => {
  // Clear cache after user creation
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode < 400) {
      clearCachePattern('dashboard');
    }
    return originalSend.call(this, data);
  };
  next();
});

// Get public announcements (admin view - all announcements)
router.get('/announcements', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, content, date, priority, type, active, created_at FROM public_announcements ORDER BY date DESC, created_at DESC'
    );
    res.json({ announcements: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save public announcement
router.post('/announcements', async (req, res) => {
  try {
    const { id, title, content, date, priority = 'normal', type = 'General Announcement', active = true } = req.body;
    
    if (!id || !title || !content || !date) {
      return res.status(400).json({ message: 'id, title, content, and date are required' });
    }
    
    await query(
      `INSERT INTO public_announcements (id, title, content, date, priority, type, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id)
       DO UPDATE SET 
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         date = EXCLUDED.date,
         priority = EXCLUDED.priority,
         type = EXCLUDED.type,
         active = EXCLUDED.active`,
      [id, title, content, date, priority, type, active]
    );
    
    res.json({ message: 'Announcement saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete public announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM public_announcements WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    res.json({ message: 'Announcement deleted successfully' });
    clearCachePattern('public');
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Generate announcement ID
router.get('/announcements/generate-id', async (req, res) => {
  try {
    const now = new Date();
    const id = `ann_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    res.json({ id });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== SCHOOL BRANDING ==========

// Get school branding (text settings)
router.get('/school-branding', async (req, res) => {
  try {
    const result = await query(
      'SELECT school_name, tagline, banner_text FROM website_settings WHERE id = 1'
    );
    const row = result.rows[0] || {};
    res.json({
      branding: {
        school_name: row.school_name || '',
        tagline: row.tagline || '',
        banner_text: row.banner_text || '',
      },
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save school branding (text settings)
router.post('/school-branding', async (req, res) => {
  try {
    const school_name = (req.body?.school_name ?? req.body?.schoolName ?? '').toString().trim();
    const tagline = (req.body?.tagline ?? '').toString().trim();
    const banner_text = (req.body?.banner_text ?? req.body?.bannerText ?? '').toString().trim();

    if (!school_name) {
      return res.status(400).json({ message: 'school_name is required' });
    }

    await query(
      `INSERT INTO website_settings (id, school_name, tagline, banner_text)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id)
       DO UPDATE SET
         school_name = EXCLUDED.school_name,
         tagline = EXCLUDED.tagline,
         banner_text = EXCLUDED.banner_text,
         updated_at = NOW()`,
      [school_name, tagline, banner_text]
    );

    res.json({ message: 'School branding saved successfully' });
    clearCachePattern('public');
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get school logo
router.get('/school-logo', async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'school_logo'
      );
    `);
    
    if (tableCheck.rows.length === 0 || !tableCheck.rows[0].exists) {
      return res.json({ logo: null });
    }
    
    const result = await query('SELECT * FROM school_logo WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ logo: null });
    }
    res.json({ logo: result.rows[0] });
  } catch (error) {
    console.error('[SCHOOL LOGO] Error:', error);
    // Return null instead of 500 error to prevent breaking the UI
    res.json({ logo: null });
  }
});

// Upload school logo
router.post('/school-logo', requireRole('admin', 'superadmin'), schoolLogoUpload.single('logo_file'), async (req, res) => {
  try {
    console.log('[SCHOOL LOGO] Route handler reached — req.file:', req.file
      ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, filename: req.file.filename, path: req.file.path }
      : null);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if table exists first
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'school_logo'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS school_logo (
          id INTEGER PRIMARY KEY DEFAULT 1,
          logo_image_path VARCHAR(255),
          cloudinary_public_id VARCHAR(255),
          school_name VARCHAR(255),
          motto VARCHAR(255),
          address TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT chk_logo_id CHECK (id = 1)
        )
      `);
    }

    // Ensure cloudinary_public_id column exists on older tables
    await query(`ALTER TABLE school_logo ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255)`);

    // Get old logo Cloudinary public_id (handle gracefully if query fails)
    let oldCloudinaryPublicId = null;
    try {
      const oldLogoResult = await query('SELECT cloudinary_public_id FROM school_logo WHERE id = 1');
      oldCloudinaryPublicId = oldLogoResult.rows[0]?.cloudinary_public_id;
    } catch (err) {
      // Could not fetch old logo, continue
    }

    // Delete old logo from Cloudinary if it exists
    if (oldCloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCloudinaryPublicId);
      } catch (err) {
        console.warn('[SCHOOL LOGO] Failed to delete old Cloudinary asset:', err.message);
      }
    }

    // CloudinaryStorage sets req.file.path to the secure URL and req.file.filename to the public_id
    const logoUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;
    console.log(`✅ School logo uploaded to Cloudinary: ${cloudinaryPublicId}`);
    
    // Save to database
    await query(
      `INSERT INTO school_logo (id, logo_image_path, cloudinary_public_id)
       VALUES (1, $1, $2)
       ON CONFLICT (id)
       DO UPDATE SET logo_image_path = EXCLUDED.logo_image_path, cloudinary_public_id = EXCLUDED.cloudinary_public_id, updated_at = NOW()`,
      [logoUrl, cloudinaryPublicId]
    );

    res.json({ message: 'Logo uploaded successfully', url: logoUrl, public_id: cloudinaryPublicId, logo_path: logoUrl });
  } catch (error) {
    console.error('[SCHOOL LOGO] Upload error:', error);
    return sendError(res, error, 500);
  }
});

// Get school stamp
router.get('/school-stamp', async (req, res) => {
  try {
    const result = await query('SELECT * FROM school_stamp WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ stamp: null });
    }
    res.json({ stamp: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload school stamp
router.post('/school-stamp', requireRole('admin', 'superadmin'), schoolStampUpload.single('stamp_file'), async (req, res) => {
  try {
    console.log('[SCHOOL STAMP] Route handler reached — req.file:', req.file
      ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, filename: req.file.filename, path: req.file.path }
      : null);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Ensure cloudinary_public_id column exists on older tables
    await query(`ALTER TABLE school_stamp ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255)`);

    // Get old stamp Cloudinary public_id
    let oldCloudinaryPublicId = null;
    try {
      const oldStampResult = await query('SELECT cloudinary_public_id FROM school_stamp WHERE id = 1');
      oldCloudinaryPublicId = oldStampResult.rows[0]?.cloudinary_public_id;
    } catch (err) {
      // Could not fetch old stamp, continue
    }

    // Delete old stamp from Cloudinary if it exists
    if (oldCloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCloudinaryPublicId);
      } catch (err) {
        console.warn('[SCHOOL STAMP] Failed to delete old Cloudinary asset:', err.message);
      }
    }

    // CloudinaryStorage sets req.file.path to the secure URL and req.file.filename to the public_id
    const stampUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;
    console.log(`✅ School stamp uploaded to Cloudinary: ${cloudinaryPublicId}`);

    // Save to database
    await query(
      `INSERT INTO school_stamp (id, stamp_image_path, cloudinary_public_id)
       VALUES (1, $1, $2)
       ON CONFLICT (id)
       DO UPDATE SET stamp_image_path = EXCLUDED.stamp_image_path, cloudinary_public_id = EXCLUDED.cloudinary_public_id, updated_at = NOW()`,
      [stampUrl, cloudinaryPublicId]
    );

    res.json({ message: 'Stamp uploaded successfully', url: stampUrl, public_id: cloudinaryPublicId, stamp_path: stampUrl });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get authority data
router.get('/authority-data', async (req, res) => {
  try {
    const result = await query('SELECT * FROM authority_data WHERE id = 1');
    if (result.rows.length === 0) {
      // Return default values
      return res.json({
        authority: {
          name: 'Fr.Moses Assey',
          title: 'Rector',
          signature: '',
          signature_image_path: '',
          date: '',
        },
      });
    }
    res.json({ authority: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save authority data
router.post('/authority-data', async (req, res) => {
  try {
    const { name, title, signature = '', date = '' } = req.body;

    if (!name || !title) {
      return res.status(400).json({ message: 'name and title are required' });
    }

    // Get existing signature_image_path to preserve it
    const existingResult = await query('SELECT signature_image_path FROM authority_data WHERE id = 1');
    const signatureImagePath = existingResult.rows[0]?.signature_image_path || '';

    await query(
      `INSERT INTO authority_data (id, name, title, signature, signature_image_path, date)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id)
       DO UPDATE SET 
         name = EXCLUDED.name,
         title = EXCLUDED.title,
         signature = EXCLUDED.signature,
         date = EXCLUDED.date,
         updated_at = NOW()`,
      [name, title, signature, signatureImagePath, date]
    );

    res.json({ message: 'Authority information saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload authority signature image
router.post('/authority-data/upload-signature', requireRole('admin', 'superadmin'), authoritySignatureUpload.single('signature_file'), async (req, res) => {
  try {
    console.log('[AUTHORITY SIGNATURE] Route handler reached — req.file:', req.file
      ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, filename: req.file.filename, path: req.file.path }
      : null);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Ensure cloudinary_public_id column exists on older tables
    await query(`ALTER TABLE authority_data ADD COLUMN IF NOT EXISTS cloudinary_public_id VARCHAR(255)`);

    // Get old signature Cloudinary public_id
    let oldCloudinaryPublicId = null;
    try {
      const oldSignatureResult = await query('SELECT cloudinary_public_id FROM authority_data WHERE id = 1');
      oldCloudinaryPublicId = oldSignatureResult.rows[0]?.cloudinary_public_id;
    } catch (err) {
      // Could not fetch old signature, continue
    }

    // Delete old signature from Cloudinary if it exists
    if (oldCloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCloudinaryPublicId);
      } catch (err) {
        console.warn('[AUTHORITY SIGNATURE] Failed to delete old Cloudinary asset:', err.message);
      }
    }

    // CloudinaryStorage sets req.file.path to the secure URL and req.file.filename to the public_id
    const signatureUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;
    console.log(`✅ Authority signature uploaded to Cloudinary: ${cloudinaryPublicId}`);

    // Check if authority data exists
    const existingDataResult = await query('SELECT name, title FROM authority_data WHERE id = 1');
    
    if (existingDataResult.rows.length === 0) {
      // No existing data, insert with default values
      await query(
        `INSERT INTO authority_data (id, name, title, signature_image_path, cloudinary_public_id)
         VALUES (1, $1, $2, $3, $4)`,
        ['Fr.Moses Assey', 'Rector', signatureUrl, cloudinaryPublicId]
      );
    } else {
      // Existing data, update only signature_image_path and cloudinary_public_id
      await query(
        `UPDATE authority_data 
         SET signature_image_path = $1, cloudinary_public_id = $2, updated_at = NOW() 
         WHERE id = 1`,
        [signatureUrl, cloudinaryPublicId]
      );
    }

    res.json({ message: 'Signature image uploaded successfully', url: signatureUrl, public_id: cloudinaryPublicId, signature_path: signatureUrl });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete authority signature image
router.post('/authority-data/delete-signature', async (req, res) => {
  try {
    // Get existing signature Cloudinary public_id
    const result = await query('SELECT signature_image_path, cloudinary_public_id FROM authority_data WHERE id = 1');
    const signaturePath = result.rows[0]?.signature_image_path;
    const cloudinaryPublicId = result.rows[0]?.cloudinary_public_id;

    if (signaturePath || cloudinaryPublicId) {
      // Delete from Cloudinary if public_id exists
      if (cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryPublicId);
        } catch (err) {
          console.warn('[AUTHORITY SIGNATURE] Failed to delete Cloudinary asset:', err.message);
        }
      }

      // Update database
      await query(
        'UPDATE authority_data SET signature_image_path = $1, cloudinary_public_id = $2 WHERE id = 1',
        ['', null]
      );
    }

    res.json({ message: 'Signature image deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get patron saint image
router.get('/patron-saint-image', async (req, res) => {
  try {
    const result = await query('SELECT patron_saint_image FROM website_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({ patron_saint_image: null });
    }
    res.json({ patron_saint_image: result.rows[0].patron_saint_image || null });
  } catch (error) {
    console.error('[PATRON SAINT] Error fetching image:', error);
    return sendError(res, error, 500);
  }
});

// Upload patron saint image
router.post('/patron-saint-image', requireRole('admin', 'superadmin'), patronSaintUpload.single('patron_saint_file'), async (req, res) => {
  try {
    console.log('[PATRON SAINT] Route handler reached — req.file:', req.file
      ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, filename: req.file.filename, path: req.file.path }
      : null);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Ensure patron_saint_cloudinary_public_id column exists on older tables
    await query(`ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS patron_saint_cloudinary_public_id VARCHAR(255)`);

    // Get old patron saint image Cloudinary public_id
    let oldCloudinaryPublicId = null;
    try {
      const oldImageResult = await query('SELECT patron_saint_cloudinary_public_id FROM website_settings WHERE id = 1');
      oldCloudinaryPublicId = oldImageResult.rows[0]?.patron_saint_cloudinary_public_id;
    } catch (err) {
      // Could not fetch old image, continue
    }

    // Delete old image from Cloudinary if it exists
    if (oldCloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCloudinaryPublicId);
      } catch (err) {
        console.warn('[PATRON SAINT] Failed to delete old Cloudinary asset:', err.message);
      }
    }

    // CloudinaryStorage sets req.file.path to the secure URL and req.file.filename to the public_id
    const imageUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;
    console.log(`✅ Patron saint image uploaded to Cloudinary: ${cloudinaryPublicId}`);

    // Check if website_settings exists
    const existingResult = await query('SELECT id FROM website_settings WHERE id = 1');
    
    if (existingResult.rows.length === 0) {
      // Insert new record
      await query(
        `INSERT INTO website_settings (id, patron_saint_image, patron_saint_cloudinary_public_id)
         VALUES (1, $1, $2)`,
        [imageUrl, cloudinaryPublicId]
      );
    } else {
      // Update existing record
      await query(
        `UPDATE website_settings 
         SET patron_saint_image = $1, patron_saint_cloudinary_public_id = $2
         WHERE id = 1`,
        [imageUrl, cloudinaryPublicId]
      );
    }

    res.json({ message: 'Patron saint image uploaded successfully', url: imageUrl, public_id: cloudinaryPublicId, patron_saint_image_path: imageUrl });
  } catch (error) {
    console.error('[PATRON SAINT] Upload error:', error);
    return sendError(res, error, 500);
  }
});

// Get user by ID
router.get('/users/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, username, full_name, role, status, permissions, email, phone, profile_picture, bio, department, position FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    // Parse permissions JSON with error handling
    try {
      user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
    } catch (parseError) {
      console.error('Failed to parse permissions for user:', user.username, parseError);
      user.permissions = null;
    }
    
    res.json({ user });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save user (create or update)
router.post('/users', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { id, username, full_name, password, role, status, permissions, email, phone, bio, department, position } = req.body;
    
    if (!username || !full_name || !role) {
      return res.status(400).json({ message: 'username, full_name, and role are required' });
    }
    
    // Validate role
    const validRoles = ['admin', 'superadmin', 'teacher', 'secretary', 'priest', 'discipline', 'rector', 'vice_rector', 'academic_master', 'accountant', 'librarian', 'discipline_master', 'sports_master'];
    const normalizedRole = role.toLowerCase();
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: `Invalid role. Valid roles are: ${validRoles.join(', ')}` });
    }
    
    // Check if current user is trying to assign a higher role than their own
    const currentUserRole = req.user?.role?.toLowerCase();
    if (normalizedRole === 'superadmin' && currentUserRole !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can assign superadmin role' });
    }
    
    // Use normalized role
    const finalRole = normalizedRole;
    
    // Check if username exists (for new users or if username changed)
    if (!id) {
      const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    } else {
      // Check if username is being changed to one that already exists
      const currentUser = await query('SELECT username FROM users WHERE id = $1', [id]);
      if (currentUser.rows.length > 0 && currentUser.rows[0].username !== username) {
        const existingUser = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
        if (existingUser.rows.length > 0) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
    }
    
    // Hash password if provided
    let passwordHash = null;
    if (password) {
      try {
        passwordHash = await bcrypt.hash(password, 10);
      } catch (hashError) {
        console.error('Error hashing password:', hashError);
        return res.status(500).json({ message: 'Error processing password' });
      }
    } else if (!id) {
      return res.status(400).json({ message: 'Password is required for new users' });
    }
    
    // Get existing password hash if updating without password
    if (id && !passwordHash) {
      try {
        const existingUser = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length > 0) {
          passwordHash = existingUser.rows[0].password_hash;
        }
      } catch (queryError) {
        console.error('Error fetching existing user:', queryError);
        return res.status(500).json({ message: 'Error fetching user data' });
      }
    }
    
    // Serialize permissions with error handling
    let permissionsJson = null;
    try {
      permissionsJson = permissions ? JSON.stringify(permissions) : null;
    } catch (stringifyError) {
      console.error('Failed to stringify permissions:', stringifyError);
      return res.status(400).json({ message: 'Invalid permissions format' });
    }
    
    if (id) {
      // Update existing user
      await query(
        `UPDATE users 
         SET username = $1, full_name = $2, password_hash = $3, role = $4, status = $5, 
         permissions = $6, email = $7, phone = $8, bio = $9, department = $10, position = $11, updated_at = NOW()
         WHERE id = $12`,
        [username, full_name, passwordHash, finalRole, status || 'active', permissionsJson, email || null, phone || null, bio || null, department || null, position || null, id]
      );
    } else {
      // Create new user
      await query(
        `INSERT INTO users (username, password_hash, full_name, role, status, permissions, email, phone, bio, department, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [username, passwordHash, full_name, finalRole, status || 'active', permissionsJson, email || null, phone || null, bio || null, department || null, position || null]
      );
    }
    
    res.json({ message: `User ${id ? 'updated' : 'created'} successfully` });
  } catch (error) {
    console.error('Error in POST /users:', error);
    return sendError(res, error, 500);
  }
});

// Delete user
router.delete('/users/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    
    // Prevent deleting self
    if (id === currentUserId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Check if user exists
    const userResult = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const role = userResult.rows[0].role;
    const normalizedRole = role?.toUpperCase();
    
    // Check if user is protected (admin or superadmin)
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN') {
      return res.status(400).json({ message: 'Cannot delete admin or superadmin users' });
    }
    
    // Check if current user has sufficient privileges
    const currentUserRole = req.user?.role?.toUpperCase();
    if (currentUserRole !== 'SUPERADMIN' && currentUserRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Insufficient privileges' });
    }
    
    await query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get subjects for permission management
router.get('/subjects-list', async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT subject_name, subject_code, level, stream FROM subjects ORDER BY level, stream, subject_name'
    );
    res.json({ subjects: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== STUDENT PROMOTION ==========

// Get promotion dashboard data
router.get('/promotion/dashboard', async (req, res) => {
  try {
    // Get recent promotion sessions
    const sessionsResult = await query(
      `SELECT * FROM promotion_sessions 
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    
    res.json({ sessions: sessionsResult.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get promotion preview data
router.get('/promotion/preview', async (req, res) => {
  try {
    const { level, stream, year } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }

    // Normalize case to match DB values consistently.
    const normalizedLevel = level.toString().trim().toUpperCase();
    const normalizedStream = stream.toString().trim().toUpperCase();
    
    // Get students from source class
    const studentsResult = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [normalizedLevel, normalizedStream, parseInt(year)]
    );
    
    // Determine next level and stream
    const getNextLevel = (currentLevel) => {
      const progression = {
        // Carry forward the stream for FORM I-III.
        // UI selects A/B for these levels, and the students table is expected to store A/B streams.
        'FORM I': { next: 'FORM II', stream: normalizedStream, requiresSelection: false },
        'FORM II': { next: 'FORM III', stream: normalizedStream, requiresSelection: false },
        'FORM III': { next: 'FORM IV', stream: normalizedStream, requiresSelection: false },
        'FORM IV': { next: 'FORM V', stream: null, requiresSelection: true },
        'FORM V': { next: 'FORM VI', stream: normalizedStream, requiresSelection: false },
        // Normalize: keep A/B (or current stream) instead of forcing 'NA'
        // so the students table always has a real stream value.
        'FORM VI': { next: 'GRADUATED', stream: normalizedStream, requiresSelection: false },
      };
      return progression[currentLevel] || { next: null, stream: normalizedStream, requiresSelection: false };
    };
    
    const nextLevelInfo = getNextLevel(normalizedLevel);
    const nextYear = parseInt(year) + 1;
    
    // Get excluded students
    const exclusionsResult = await query(
      'SELECT adm_no FROM promotion_exclusions WHERE level = $1 AND stream = $2 AND year = $3',
      [normalizedLevel, normalizedStream, parseInt(year)]
    );
    const excludedAdmNos = exclusionsResult.rows.map(row => row.adm_no);
    
    // Check if promotion already executed
    const existingPromotion = await query(
      'SELECT * FROM promotion_sessions WHERE from_level = $1 AND from_stream = $2 AND from_year = $3 LIMIT 1',
      [normalizedLevel, normalizedStream, parseInt(year)]
    );
    
    res.json({
      students: studentsResult.rows,
      next_level: nextLevelInfo.next,
      next_stream: nextLevelInfo.stream,
      next_year: nextYear,
      requires_stream_selection: nextLevelInfo.requiresSelection,
      excluded_adm_nos: excludedAdmNos,
      already_promoted: existingPromotion.rows.length > 0,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Execute promotion
router.post('/promotion/execute', async (req, res) => {
  try {
    const { from_level, from_stream, from_year, to_level, to_stream, to_year, excluded_adm_nos = [] } = req.body;
    
    if (!from_level || !from_stream || !from_year || !to_level || !to_stream || !to_year) {
      return res.status(400).json({ message: 'All promotion parameters are required' });
    }

    const normalizedFromLevel = from_level.toString().trim().toUpperCase();
    const normalizedFromStream = from_stream.toString().trim().toUpperCase();
    const normalizedToLevel = to_level.toString().trim().toUpperCase();
    const normalizedToStream = to_stream.toString().trim().toUpperCase();
    
    // Check if promotion already executed
    const existingPromotion = await query(
      'SELECT * FROM promotion_sessions WHERE from_level = $1 AND from_stream = $2 AND from_year = $3 LIMIT 1',
      [normalizedFromLevel, normalizedFromStream, parseInt(from_year)]
    );
    
    if (existingPromotion.rows.length > 0) {
      return res.status(400).json({ message: 'Promotion already executed for this class' });
    }
    
    // Get all students from source class
    const studentsResult = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [normalizedFromLevel, normalizedFromStream, parseInt(from_year)]
    );
    
    const allStudents = studentsResult.rows;
    const studentsToPromote = allStudents.filter(s => !excluded_adm_nos.includes(s.adm_no));
    
    let promotedCount = 0;
    let failedCount = 0;
    
    // OPTIMIZED: Use batch operations instead of sequential loops
    await withTransaction(async (client) => {
      // Build index mappings in memory (no DB queries needed)
      const oldIndexMap = {};
      allStudents.forEach((s, i) => {
        oldIndexMap[s.adm_no] = i;
      });
      
      // Batch insert all students to new class
      for (const student of studentsToPromote) {
        await client.query(
          `INSERT INTO students (adm_no, first_name, middle_name, surname, sex, level, stream, year, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (adm_no, level, stream, year) DO NOTHING`,
          [student.adm_no, student.first_name, student.middle_name || null, student.surname, student.sex,
           normalizedToLevel, normalizedToStream, parseInt(to_year), 'PENDING']
        );
      }
      
      // Get new class students to build new index mapping
      const newClassStudents = await client.query(
        'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
        [normalizedToLevel, normalizedToStream, parseInt(to_year)]
      );
      const newIndexMap = {};
      newClassStudents.rows.forEach((s, i) => {
        newIndexMap[s.adm_no] = i;
      });
      
      // Batch copy photos using INSERT...SELECT with index mapping
      for (const student of studentsToPromote) {
        const oldIndex = oldIndexMap[student.adm_no];
        const newIndex = newIndexMap[student.adm_no];
        
        if (oldIndex !== undefined && newIndex !== undefined) {
          await client.query(
            `INSERT INTO student_photos (level, stream, year, student_index, photo_filename)
             SELECT $1, $2, $3, $4, photo_filename
             FROM student_photos
             WHERE level = $5 AND stream = $6 AND year = $7 AND student_index = $8`,
            [normalizedToLevel, normalizedToStream, parseInt(to_year), newIndex, 
             normalizedFromLevel, normalizedFromStream, parseInt(from_year), oldIndex]
          );
          
          // Batch copy parish
          await client.query(
            `INSERT INTO student_parishes (level, stream, year, student_index, parish_name)
             SELECT $1, $2, $3, $4, parish_name
             FROM student_parishes
             WHERE level = $5 AND stream = $6 AND year = $7 AND student_index = $8`,
            [normalizedToLevel, normalizedToStream, parseInt(to_year), newIndex,
             normalizedFromLevel, normalizedFromStream, parseInt(from_year), oldIndex]
          );
          
          // Batch copy comments (Huduma and Michezo)
          await client.query(
            `INSERT INTO comments (comment_type, level, stream, year, term, student_index, comment_text)
             SELECT comment_type, $1, $2, $3, term, $4, comment_text
             FROM comments
             WHERE comment_type IN ('Huduma', 'Michezo') 
               AND level = $5 AND stream = $6 AND year = $7 AND student_index = $8`,
            [normalizedToLevel, normalizedToStream, parseInt(to_year), newIndex.toString(),
             normalizedFromLevel, normalizedFromStream, parseInt(from_year), oldIndex.toString()]
          );
        }
      }
      
      // Batch copy subjects (class-level, not per-student)
      await client.query(
        `INSERT INTO subjects (level, stream, year, subject_code, subject_name, subject_abbreviation)
         SELECT $1, $2, $3, subject_code, subject_name, subject_abbreviation
         FROM subjects
         WHERE level = $4 AND stream = $5 AND year = $6`,
        [normalizedToLevel, normalizedToStream, parseInt(to_year),
         normalizedFromLevel, normalizedFromStream, parseInt(from_year)]
      );
      
      // Batch copy teachers (class-level, not per-student)
      await client.query(
        `INSERT INTO subject_teachers (level, stream, year, subject_code, teacher_name, teacher_signature)
         SELECT $1, $2, $3, subject_code, teacher_name, teacher_signature
         FROM subject_teachers
         WHERE level = $4 AND stream = $5 AND year = $6`,
        [normalizedToLevel, normalizedToStream, parseInt(to_year),
         normalizedFromLevel, normalizedFromStream, parseInt(from_year)]
      );
      
      // Batch insert history records
      for (const student of studentsToPromote) {
        await client.query(
          `INSERT INTO student_history (adm_no, full_name, current_level, current_stream, current_year, previous_level, previous_stream, previous_year, promoted_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            student.adm_no,
            `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim(),
            normalizedToLevel,
            normalizedToStream,
            parseInt(to_year),
            normalizedFromLevel,
            normalizedFromStream,
            parseInt(from_year),
            req.user?.username || 'system'
          ]
        );
      }
      
      promotedCount = studentsToPromote.length;
    }).catch((error) => {
      console.error('Promotion batch operation failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      failedCount = studentsToPromote.length;
      promotedCount = 0;
      throw error;
    });
    
    // Save promotion session
    const sessionId = uuidv4();
    
    await query(
      `INSERT INTO promotion_sessions (session_id, from_level, from_stream, from_year, to_level, to_stream, to_year, total_students, promoted_count, excluded_count, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        normalizedFromLevel,
        normalizedFromStream,
        parseInt(from_year),
        normalizedToLevel,
        normalizedToStream,
        parseInt(to_year),
        allStudents.length,
        promotedCount,
        excluded_adm_nos.length,
        req.user?.username || 'system'
      ]
    );
    
    res.json({
      message: `Promotion completed: ${promotedCount} students promoted, ${excluded_adm_nos.length} excluded, ${failedCount} failed`,
      promoted_count: promotedCount,
      excluded_count: excluded_adm_nos.length,
      failed_count: failedCount,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get student promotion history
router.get('/promotion/history/:admNo', async (req, res) => {
  try {
    const { admNo } = req.params;
    
    const result = await query(
      `SELECT * FROM student_history 
       WHERE adm_no = $1 
       ORDER BY promotion_date DESC`,
      [admNo]
    );
    
    res.json({ history: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save promotion exclusion
router.post('/promotion/exclusions', async (req, res) => {
  try {
    const { adm_no, level, stream, year, reason } = req.body;
    
    if (!adm_no || !level || !stream || !year || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    await query(
      `INSERT INTO promotion_exclusions (adm_no, level, stream, year, reason, excluded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (adm_no, level, stream, year)
       DO UPDATE SET reason = EXCLUDED.reason, excluded_by = EXCLUDED.excluded_by, excluded_at = NOW()`,
      [adm_no, level, stream, parseInt(year), reason, req.user?.username || 'system']
    );
    
    res.json({ message: 'Exclusion saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete promotion exclusion
router.delete('/promotion/exclusions', async (req, res) => {
  try {
    const { adm_no, level, stream, year } = req.query;
    
    if (!adm_no || !level || !stream || !year) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    await query(
      'DELETE FROM promotion_exclusions WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
      [adm_no, level, stream, parseInt(year)]
    );
    
    res.json({ message: 'Exclusion removed successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== PUBLIC WEBSITE MANAGEMENT ==========

// ========== STAFF PROFILES ==========
router.get('/staff-profiles', async (req, res) => {
  try {
    await ensureStaffProfilesTable();
    const result = await query(
      `SELECT * FROM staff_profiles
       ORDER BY is_teaching DESC, display_order ASC, created_at DESC`
    );
    res.json({ staff_profiles: result.rows || [] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

router.post('/staff-profiles', requireRole('admin', 'superadmin'), staffProfileUpload, async (req, res) => {
  try {
    console.log('[STAFF PROFILE] Route handler reached — req.file:', req.file
      ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, filename: req.file.filename, path: req.file.path }
      : null);
    await ensureStaffProfilesTable();
    const {
      id,
      full_name,
      role_title,
      is_teaching = 'true',
      professional_subjects = '',
      teaching_since_year = null,
      subjects_teaching = '',
      class_teacher_for = '',
      other_duties = '',
      contact_phone = '',
      contact_email = '',
      profile_summary = '',
      display_order = 0,
      active = 'true',
      linked_username = '',
    } = req.body || {};

    if (!full_name || !role_title) {
      return res.status(400).json({ message: 'full_name and role_title are required' });
    }

    const profileId = id || uuidv4();
    const asBool = (v) => v === true || v === 'true' || v === 1 || v === '1';
    const activeBool = asBool(active);
    const teachingBool = asBool(is_teaching);
    const parsedYear = teaching_since_year ? parseInt(teaching_since_year, 10) : null;
    const parsedOrder = parseInt(display_order, 10) || 0;
    const linkedUser =
      typeof linked_username === 'string' && linked_username.trim()
        ? linked_username.trim()
        : null;

    if (linkedUser) {
      const taken = await query(
        `SELECT id FROM staff_profiles WHERE linked_username = $1 AND id <> $2 LIMIT 1`,
        [linkedUser, profileId]
      );
      if (taken.rows.length > 0) {
        return res.status(400).json({
          message: 'That login account is already linked to another staff profile.',
        });
      }
    }

    // Preserve existing photo and cloudinary_public_id when updating without a new upload
    let photoPath = null;
    let cloudinaryPublicId = null;
    const existing = await query(
      'SELECT photo_path, cloudinary_public_id, linked_username FROM staff_profiles WHERE id = $1',
      [profileId]
    );
    if (existing.rows.length > 0) {
      photoPath = existing.rows[0].photo_path || null;
      cloudinaryPublicId = existing.rows[0].cloudinary_public_id || null;
    }

    if (req.file) {
      // Delete previous photo from Cloudinary if it exists
      if (cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryPublicId);
        } catch (_) {}
      } else if (photoPath && !photoPath.startsWith('http')) {
        // Delete legacy local photo
        try {
          const oldFilePath = path.join(__dirname, '../static', photoPath);
          await fs.unlink(oldFilePath);
        } catch (_) {}
      }

      // Cloudinary storage sets path to the URL and filename to the public_id
      photoPath = req.file.path; // Cloudinary URL
      cloudinaryPublicId = req.file.filename; // Cloudinary public_id
    }

    if (existing.rows.length > 0) {
      await query(
        `UPDATE staff_profiles SET
         full_name = $1,
         role_title = $2,
         is_teaching = $3,
         professional_subjects = $4,
         teaching_since_year = $5,
         subjects_teaching = $6,
         class_teacher_for = $7,
         other_duties = $8,
         contact_phone = $9,
         contact_email = $10,
         photo_path = $11,
         cloudinary_public_id = $12,
         profile_summary = $13,
         display_order = $14,
         active = $15,
         linked_username = $16,
         updated_at = NOW()
         WHERE id = $17`,
        [
          full_name, role_title, teachingBool, professional_subjects || null, parsedYear,
          subjects_teaching || null, class_teacher_for || null, other_duties || null,
          contact_phone || null, contact_email || null, photoPath, cloudinaryPublicId, profile_summary || null,
          parsedOrder, activeBool, linkedUser, profileId
        ]
      );
    } else {
      await query(
        `INSERT INTO staff_profiles
         (id, full_name, role_title, is_teaching, professional_subjects, teaching_since_year, subjects_teaching,
          class_teacher_for, other_duties, contact_phone, contact_email, photo_path, cloudinary_public_id, profile_summary, display_order, active, linked_username)
         VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          profileId, full_name, role_title, teachingBool, professional_subjects || null, parsedYear,
          subjects_teaching || null, class_teacher_for || null, other_duties || null, contact_phone || null,
          contact_email || null, photoPath, cloudinaryPublicId, profile_summary || null, parsedOrder, activeBool,
          linkedUser
        ]
      );
    }

    if (linkedUser) {
      if (!photoPath) {
        await pullUserPhotoIntoStaffProfile(linkedUser, profileId);
        const refreshed = await query(
          'SELECT photo_path, cloudinary_public_id FROM staff_profiles WHERE id = $1',
          [profileId]
        );
        photoPath = refreshed.rows[0]?.photo_path || photoPath;
        cloudinaryPublicId = refreshed.rows[0]?.cloudinary_public_id || cloudinaryPublicId;
      }
      if (photoPath) {
        await syncPhotoFromStaffProfileToUser(linkedUser, photoPath, cloudinaryPublicId);
      }
    }

    res.json({ message: `Staff profile ${existing.rows.length > 0 ? 'updated' : 'created'} successfully`, id: profileId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload staff profile photo (standalone endpoint for updating photo only)
router.post('/staff-profiles/:id/photo', requireRole('admin', 'superadmin'), staffProfileUpload, async (req, res) => {
  try {
    console.log('[STAFF PHOTO] Route handler reached — req.file:', req.file
      ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, filename: req.file.filename, path: req.file.path }
      : null);
    await ensureStaffProfilesTable();
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const existing = await query('SELECT photo_path, cloudinary_public_id FROM staff_profiles WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const oldCloudinaryPublicId = existing.rows[0]?.cloudinary_public_id;
    const oldPhotoPath = existing.rows[0]?.photo_path;

    // Delete previous photo from Cloudinary if it exists
    if (oldCloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCloudinaryPublicId);
      } catch (_) {}
    } else if (oldPhotoPath && !oldPhotoPath.startsWith('http')) {
      try {
        const oldFilePath = path.join(__dirname, '../static', oldPhotoPath);
        await fs.unlink(oldFilePath);
      } catch (_) {}
    }

    // Cloudinary storage sets path to the URL and filename to the public_id
    const photoUrl = req.file.path;
    const cloudinaryPublicId = req.file.filename;
    console.log(`✅ Staff profile photo uploaded to Cloudinary: ${cloudinaryPublicId}`);

    await query(
      'UPDATE staff_profiles SET photo_path = $1, cloudinary_public_id = $2, updated_at = NOW() WHERE id = $3',
      [photoUrl, cloudinaryPublicId, id]
    );

    const linkRow = await query(
      'SELECT linked_username FROM staff_profiles WHERE id = $1',
      [id]
    );
    const linkedUser = linkRow.rows[0]?.linked_username;
    if (linkedUser) {
      await syncPhotoFromStaffProfileToUser(linkedUser, photoUrl, cloudinaryPublicId);
    }

    res.json({ message: 'Staff profile photo uploaded successfully', url: photoUrl, public_id: cloudinaryPublicId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

router.delete('/staff-profiles/:id', async (req, res) => {
  try {
    await ensureStaffProfilesTable();
    const { id } = req.params;
    const existing = await query(
      'SELECT photo_path, cloudinary_public_id, linked_username FROM staff_profiles WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const photoPath = existing.rows[0]?.photo_path;
    const cloudinaryPublicId = existing.rows[0]?.cloudinary_public_id;
    const linkedUser = existing.rows[0]?.linked_username;

    // Delete from Cloudinary if cloudinary_public_id exists
    if (cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId);
      } catch (_) {}
    } else if (photoPath && !photoPath.startsWith('http')) {
      // Delete legacy local photo
      try {
        const filePath = path.join(__dirname, '../static', photoPath);
        await fs.unlink(filePath);
      } catch (_) {}
    }

    if (linkedUser) {
      await clearUserPhotoForUsername(linkedUser, { destroyAsset: false });
    }

    await query('DELETE FROM staff_profiles WHERE id = $1', [id]);
    res.json({ message: 'Staff profile deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== EVENTS ==========

// ========== EVENTS ==========
// Events routes removed

// ========== GALLERY ==========

// Get all gallery photos
router.get('/gallery', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM gallery_photos ORDER BY created_at DESC'
    );
    res.json({ photos: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Upload gallery photos with multer error handling
// runCloudinaryUpload (inside galleryPhotoUpload.array) handles errors and timeout.
router.post('/gallery/upload', requireRole('admin', 'superadmin'), galleryPhotoUpload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    const { category = 'general', caption = '', date } = req.body;
    
    const uploadedPhotos = [];
    const errors = [];
    
    for (let i = 0; i < req.files.length; i++) {
      try {
        const file = req.files[i];

        if (!file || !file.path) {
          errors.push({ file: file?.originalname || `File ${i}`, error: 'File path is missing' });
          continue;
        }

        // CloudinaryStorage already uploaded the file; req.file.path is the secure URL
        const photoUrl = file.path;
        const cloudinaryPublicId = file.filename;
        console.log(`✅ Gallery photo uploaded to Cloudinary: ${cloudinaryPublicId}`);

        const photoId = `photo_${Date.now()}_${i}`;

        await query(
          `INSERT INTO gallery_photos (id, path, category, caption, date, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [photoId, photoUrl, category, caption || null, date || new Date().toISOString().split('T')[0], req.user?.username || 'admin']
        );

        uploadedPhotos.push({ id: photoId, path: photoUrl, source: 'cloudinary' });
      } catch (fileError) {
        console.error(`Error processing file ${i} (${req.files[i]?.originalname}):`, fileError);
        errors.push({ file: req.files[i]?.originalname || `File ${i}`, error: fileError.message });
      }
    }
    
    if (uploadedPhotos.length === 0) {
      return res.status(400).json({ 
        message: 'Failed to upload any photos', 
        errors: errors 
      });
    }
    
    res.json({ 
      message: `${uploadedPhotos.length} photo(s) uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`, 
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    // Ensure response hasn't been sent
    if (!res.headersSent) {
      return sendError(res, error, 500);
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
});

// Delete all gallery photos (admin only)
router.delete('/gallery/delete-all', requireRole('admin'), async (req, res) => {
  try {
    // Step 1: Get all gallery photos from database
    const result = await query('SELECT id, path FROM gallery_photos');
    const photos = result.rows;
    
    // Step 2: Delete from Cloudinary or local storage
    let deletedFiles = 0;
    let failedFiles = [];
    
    for (const photo of photos) {
      if (photo.path.includes('cloudinary.com')) {
        // Delete from Cloudinary
        try {
          const urlParts = photo.path.split('/');
          const filename = urlParts[urlParts.length - 1].split('.')[0];
          const folder = urlParts[urlParts.length - 2];
          const publicId = `${folder}/${filename}`;
          
          await cloudinary.uploader.destroy(publicId);
          deletedFiles++;
        } catch (err) {
          failedFiles.push({ path: photo.path, error: err.message });
          console.error(`   ✗ Failed to delete from Cloudinary: ${err.message}`);
        }
      } else {
        // Delete local file
        try {
          const filePath = path.join(__dirname, '../static', photo.path);
          await fs.unlink(filePath);
          deletedFiles++;
        } catch (err) {
          failedFiles.push({ path: photo.path, error: err.message });
          console.error(`   ✗ Failed to delete local file: ${err.message}`);
        }
      }
    }
    
    // Step 3: Delete all records from database
    const deleteResult = await query('DELETE FROM gallery_photos');
    
    // Log activity
    await saveUserActivity(req.user.id, 'delete_all_gallery_photos', {
      deletedCount: deleteResult.rowCount,
      deletedFiles: deletedFiles
    });
    
    res.json({
      message: `Successfully deleted ${deleteResult.rowCount} photo(s) from database and ${deletedFiles} file(s) from storage`,
      deletedRecords: deleteResult.rowCount,
      deletedFiles: deletedFiles,
      failedFiles: failedFiles.length > 0 ? failedFiles : undefined
    });
  } catch (error) {
    console.error('Error deleting all gallery photos:', error);
    return sendError(res, error, 500);
  }
});

// Delete gallery photo
router.delete('/gallery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const photoResult = await query('SELECT path FROM gallery_photos WHERE id = $1', [id]);
    if (photoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    const photoPath = photoResult.rows[0].path;
    
    // Delete from Cloudinary if it's a Cloudinary URL
    if (photoPath.includes('cloudinary.com')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = photoPath.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const publicId = `${folder}/${filename}`;
        
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    } else {
      // Delete local file if it's not a Cloudinary URL
      const path = require('path');
      const fs = require('fs').promises;
      try {
        const filePath = path.join(__dirname, '../static', photoPath);
        await fs.unlink(filePath);
      } catch (err) {
        // Photo file not found or already deleted
      }
    }
    
    await query('DELETE FROM gallery_photos WHERE id = $1', [id]);
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== ALUMNI ==========

// Get all alumni
router.get('/alumni', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM alumni ORDER BY official_names ASC'
    );
    res.json({ alumni: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save alumni (public submission)
router.post('/alumni', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }
    
    const { official_names, year_start, year_end, class_level, current_position, phone, email, social_media, philosophy } = req.body;
    
    if (!official_names || !year_start || !year_end) {
      return res.status(400).json({ message: 'official_names, year_start, and year_end are required' });
    }

    // Upload photo to Cloudinary with fallback to local storage
    let photoPath;
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'alumni-photos',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ]
      });
      photoPath = result.secure_url;
      console.log(`✅ Alumni photo uploaded to Cloudinary: ${result.public_id}`);
    } catch (cloudinaryError) {
      console.warn('⚠️  Cloudinary upload failed for alumni photo, falling back to local storage:', cloudinaryError.message);
      // Fallback: save to local filesystem
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      const relativePath = `uploads/photos/${filename}`;
      const newFilePath = path.join(__dirname, '../static', relativePath);
      await fs.mkdir(path.dirname(newFilePath), { recursive: true });
      await fs.rename(req.file.path, newFilePath);
      photoPath = relativePath;
    } finally {
      // Clean up temp file if it still exists
      try { await fs.unlink(req.file.path).catch(() => {}); } catch (_) {}
    }
    
    const alumniId = `alumni_${Date.now()}`;
    
    await query(
      `INSERT INTO alumni (id, official_names, year_start, year_end, class_level, current_position, phone, email, social_media, philosophy, photo, submitted_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [alumniId, official_names, year_start, year_end, class_level || null, current_position || null, phone || null, email || null, social_media || null, philosophy || null, photoPath, new Date().toISOString().split('T')[0], 'pending']
    );
    
    res.json({ message: 'Alumni registration submitted successfully. Awaiting approval.', id: alumniId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Update alumni status (approve/reject)
router.post('/alumni/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    await query('UPDATE alumni SET status = $1 WHERE id = $2', [status, id]);
    res.json({ message: `Alumni ${status} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete alumni
router.delete('/alumni/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const alumniResult = await query('SELECT photo FROM alumni WHERE id = $1', [id]);
    if (alumniResult.rows.length > 0 && alumniResult.rows[0] && alumniResult.rows[0].photo) {
      const photoUrl = alumniResult.rows[0].photo;
      if (photoUrl.startsWith('http') && photoUrl.includes('cloudinary.com')) {
        // Delete from Cloudinary — extract public_id from URL
        try {
          const urlParts = photoUrl.split('/');
          const filenameWithExt = urlParts[urlParts.length - 1];
          const filename = filenameWithExt.split('.')[0];
          const folder = urlParts[urlParts.length - 2];
          const publicId = `${folder}/${filename}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn('Failed to delete alumni photo from Cloudinary:', err.message);
        }
      } else if (!photoUrl.startsWith('http')) {
        // Legacy local file
        try {
          const filePath = path.join(__dirname, '../static', photoUrl);
          await fs.unlink(filePath);
        } catch (err) {
          // Photo file not found or already deleted
        }
      }
    }
    
    await query('DELETE FROM alumni WHERE id = $1', [id]);
    res.json({ message: 'Alumni deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== TESTIMONIES ==========
// Testimonies routes removed


// ========== FAQs ==========

// Get all FAQs
router.get('/faqs', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM faqs ORDER BY display_order ASC, created_at DESC'
    );
    res.json({ faqs: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get active FAQs (for public)
router.get('/faqs/active', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM faqs WHERE active = 1 ORDER BY display_order ASC, created_at DESC LIMIT 5'
    );
    res.json({ faqs: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save FAQ
router.post('/faqs', async (req, res) => {
  try {
    const { id, question, answer, category, display_order, active = true } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ message: 'question and answer are required' });
    }
    
    const faqId = id || uuidv4();
    
    // Check if FAQ exists
    const existing = await query('SELECT id FROM faqs WHERE id = $1', [faqId]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE faqs SET 
         question = $1,
         answer = $2,
         category = $3,
         display_order = $4,
         active = $5,
         updated_at = NOW()
         WHERE id = $6`,
        [question, answer, category || 'General', display_order || 0, active, faqId]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO faqs (id, question, answer, category, display_order, active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [faqId, question, answer, category || 'General', display_order || 0, active]
      );
    }
    
    res.json({ message: 'FAQ saved successfully', id: faqId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Toggle FAQ active status
router.post('/faqs/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    await query('UPDATE faqs SET active = $1 WHERE id = $2', [active, id]);
    res.json({ message: `FAQ ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete FAQ
router.delete('/faqs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM faqs WHERE id = $1', [id]);
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Bulk insert FAQs
router.post('/faqs/bulk', async (req, res) => {
  try {
    const { faqs } = req.body;
    
    if (!Array.isArray(faqs) || faqs.length === 0) {
      return res.status(400).json({ message: 'faqs array is required' });
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const faq of faqs) {
      try {
        if (!faq.question || !faq.answer) {
          errorCount++;
          errors.push({ faq, error: 'question and answer are required' });
          continue;
        }
        
        const faqId = faq.id || uuidv4();
        await query(
          `INSERT INTO faqs (id, question, answer, category, display_order, active)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            faqId,
            faq.question,
            faq.answer,
            faq.category || 'General',
            faq.display_order || 0,
            faq.active !== false
          ]
        );
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ faq, error: error.message });
      }
    }
    
    res.json({
      message: `Bulk insert completed: ${successCount} FAQs added, ${errorCount} errors`,
      success_count: successCount,
      error_count: errorCount,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== DEPARTMENT CONTACTS ==========

async function ensureDepartmentContactColumns() {
  await query(`
    ALTER TABLE website_settings
    ADD COLUMN IF NOT EXISTS admissions_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS academics_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bursar_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS alumni_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS parents_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS footer_social_label VARCHAR(255),
    ADD COLUMN IF NOT EXISTS footer_copyright TEXT,
    ADD COLUMN IF NOT EXISTS contact_info_heading VARCHAR(255),
    ADD COLUMN IF NOT EXISTS office_hours_heading VARCHAR(255),
    ADD COLUMN IF NOT EXISTS department_contacts_heading VARCHAR(255),
    ADD COLUMN IF NOT EXISTS map_heading VARCHAR(255),
    ADD COLUMN IF NOT EXISTS social_heading VARCHAR(255)
  `);

  await query(`
    UPDATE website_settings
    SET footer_copyright = 'Arusha Catholic Seminary'
    WHERE id = 1
      AND (
        footer_copyright IS NULL
        OR TRIM(footer_copyright) = ''
        OR footer_copyright ~* '^jimbo[[:space:]]+kuu'
        OR footer_copyright ~* '^seminari[[:space:]]+ya[[:space:]]+kikatoliki[[:space:]]+arusha'
      )
  `);
}

const SITE_CONTACT_FIELDS = [
  'contact_address',
  'contact_phone',
  'contact_email',
  'contact_whatsapp',
  'social_youtube',
  'social_facebook',
  'social_instagram',
  'social_twitter',
  'social_location',
  'office_weekdays',
  'office_saturday',
  'office_sunday',
  'office_holidays',
  'admissions_email',
  'academics_email',
  'bursar_email',
  'alumni_email',
  'parents_email',
  'footer_social_label',
  'footer_copyright',
  'contact_info_heading',
  'office_hours_heading',
  'department_contacts_heading',
  'map_heading',
  'social_heading',
];

// Get department contacts (from website settings)
router.get('/department-contacts', async (req, res) => {
  try {
    await ensureDepartmentContactColumns();
    const cols = SITE_CONTACT_FIELDS.join(', ');
    const result = await query(`SELECT ${cols} FROM website_settings WHERE id = 1`);
    
    if (result.rows.length === 0) {
      const empty = {};
      SITE_CONTACT_FIELDS.forEach((key) => {
        empty[key] = '';
      });
      return res.json({ contacts: empty });
    }
    
    res.json({ contacts: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Update department + site contact fields (website_settings row id=1)
router.post('/department-contacts', async (req, res) => {
  try {
    await ensureDepartmentContactColumns();
    const values = SITE_CONTACT_FIELDS.map((key) => req.body[key] ?? '');
    
    const existing = await query('SELECT id FROM website_settings WHERE id = 1');
    
    if (existing.rows.length > 0) {
      const setClause = SITE_CONTACT_FIELDS.map((key, i) => `${key} = $${i + 1}`).join(',\n         ');
      await query(
        `UPDATE website_settings SET 
         ${setClause},
         updated_at = NOW()
         WHERE id = 1`,
        values
      );
    } else {
      const cols = SITE_CONTACT_FIELDS.join(', ');
      const placeholders = SITE_CONTACT_FIELDS.map((_, i) => `$${i + 1}`).join(', ');
      await query(
        `INSERT INTO website_settings (id, ${cols})
         VALUES (1, ${placeholders})`,
        values
      );
    }
    
    res.json({ message: 'Site and department contacts updated successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== PUBLIC PAGES ==========

// Get all public pages
router.get('/public-pages', async (req, res) => {
  try {
    const result = await query('SELECT * FROM public_pages ORDER BY page_name');
    res.json({ pages: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get public page by name
router.get('/public-pages/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    const result = await query('SELECT * FROM public_pages WHERE page_name = $1', [pageName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Page not found' });
    }
    
    res.json({ page: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save public page
router.post('/public-pages', async (req, res) => {
  try {
    const rawName = String(req.body.page_name || '').trim();
    const page_name = PUBLIC_PAGE_SLUG_ALIASES[rawName] || rawName;
    const { title, html_content } = req.body;
    
    if (!page_name || !title || !html_content) {
      return res.status(400).json({ message: 'page_name, title, and html_content are required' });
    }
    
    // Check if page exists
    const existing = await query('SELECT page_name FROM public_pages WHERE page_name = $1', [page_name]);
    
    if (existing.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE public_pages SET 
         title = $1,
         html_content = $2,
         updated_at = NOW()
         WHERE page_name = $3`,
        [title, html_content, page_name]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO public_pages (page_name, title, html_content)
         VALUES ($1, $2, $3)`,
        [page_name, title, html_content]
      );
    }
    
    res.json({ message: 'Page saved successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete public page content (falls back to hardcoded public page defaults)
router.delete('/public-pages/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    if (!pageName || !pageName.trim()) {
      return res.status(400).json({ message: 'pageName is required' });
    }

    const result = await query(
      'DELETE FROM public_pages WHERE page_name = $1 RETURNING page_name',
      [pageName.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Page content not found' });
    }

    res.json({ message: 'Page content deleted successfully', page_name: result.rows[0]?.page_name });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== NECTA RESULTS URLS MANAGEMENT ==========

// Get all NECTA result URLs
router.get('/necta-urls', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM necta_result_urls ORDER BY exam_type, year DESC'
    );
    res.json({ urls: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get NECTA URL by exam type and year
router.get('/necta-urls/:examType/:year', async (req, res) => {
  try {
    const { examType, year } = req.params;
    const result = await query(
      'SELECT * FROM necta_result_urls WHERE exam_type = $1 AND year = $2',
      [examType, parseInt(year)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'URL not found' });
    }
    res.json({ url: result.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Save NECTA result URL
router.post('/necta-urls', async (req, res) => {
  try {
    const { id, exam_type, year, url, description, active = true } = req.body;
    
    if (!exam_type || !year || !url) {
      return res.status(400).json({ message: 'exam_type, year, and url are required' });
    }
    
    // Validate exam_type
    if (!['ftna', 'csee', 'acsee'].includes(exam_type.toLowerCase())) {
      return res.status(400).json({ message: 'exam_type must be ftna, csee, or acsee' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid URL format' });
    }
    
    const urlId = id || uuidv4();
    
    // Check if URL exists
    const existing = await query(
      'SELECT id FROM necta_result_urls WHERE exam_type = $1 AND year = $2',
      [exam_type.toLowerCase(), parseInt(year)]
    );
    
    if (existing.rows.length > 0 && existing.rows[0].id !== urlId) {
      return res.status(400).json({ message: 'URL already exists for this exam type and year' });
    }
    
    if (existing.rows.length > 0 && existing.rows[0].id === urlId) {
      // Update existing
      await query(
        `UPDATE necta_result_urls SET 
         exam_type = $1,
         year = $2,
         url = $3,
         description = $4,
         active = $5,
         updated_at = NOW()
         WHERE id = $6`,
        [exam_type.toLowerCase(), parseInt(year), url, description || null, active, urlId]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO necta_result_urls (id, exam_type, year, url, description, active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [urlId, exam_type.toLowerCase(), parseInt(year), url, description || null, active]
      );
    }
    
    res.json({ message: 'NECTA URL saved successfully', id: urlId });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Delete NECTA result URL
router.delete('/necta-urls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM necta_result_urls WHERE id = $1', [id]);
    res.json({ message: 'NECTA URL deleted successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Toggle NECTA URL active status
router.post('/necta-urls/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    await query('UPDATE necta_result_urls SET active = $1 WHERE id = $2', [active, id]);
    res.json({ message: `NECTA URL ${active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// ========== NECTA IMPORT & ANALYTICS (for AI and reports) ==========
const axios = require('axios');
const cheerio = require('cheerio');
const { parseNectaResultsTable } = require('../utils/nectaParser');

async function ensureNectaTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS necta_candidates (
      id SERIAL PRIMARY KEY,
      exam_type VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL,
      candidate_no VARCHAR(100),
      candidate_name VARCHAR(500),
      sex VARCHAR(100),
      division VARCHAR(100),
      points INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(exam_type, year, candidate_no)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS necta_subject_grades (
      id SERIAL PRIMARY KEY,
      exam_type VARCHAR(20) NOT NULL,
      year INTEGER NOT NULL,
      candidate_no VARCHAR(100) NOT NULL,
      subject_code VARCHAR(100),
      subject_name VARCHAR(300),
      grade VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try {
    await query('ALTER TABLE necta_candidates ALTER COLUMN candidate_no TYPE VARCHAR(100), ALTER COLUMN sex TYPE VARCHAR(100), ALTER COLUMN division TYPE VARCHAR(100)');
  } catch (_) {}
  try {
    await query('ALTER TABLE necta_subject_grades ALTER COLUMN candidate_no TYPE VARCHAR(100), ALTER COLUMN subject_name TYPE VARCHAR(300), ALTER COLUMN grade TYPE VARCHAR(50)');
  } catch (_) {}
}

function gradeToPoint(grade) {
  const g = (grade || '').toString().trim().toUpperCase();
  if (['I', 'A', '1'].includes(g)) return 5;
  if (['II', 'B', '2'].includes(g)) return 4;
  if (['III', 'C', '3'].includes(g)) return 3;
  if (['IV', 'D', '4'].includes(g)) return 2;
  if (['0', 'E', '5'].includes(g)) return 1;
  return 0; // F, 6, 7, etc.
}

// Import NECTA results from URL (from necta_result_urls or generated)
router.post('/necta/import', async (req, res) => {
  try {
    const { exam_type, year } = req.body;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    const exam = (exam_type + '').toLowerCase();
    const yearInt = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;
    
    // ACSEE (Form VI) starts from 2026, FTNA/CSEE start from 2020
    const minYear = exam === 'acsee' ? 2026 : 2020;
    
    if (!['ftna', 'csee', 'acsee'].includes(exam) || isNaN(yearInt) || yearInt < minYear || yearInt > maxYear) {
      return res.status(400).json({ 
        message: `Invalid exam_type or year. Year must be between ${minYear} and ${maxYear} for ${exam.toUpperCase()}` 
      });
    }
    await ensureNectaTables();

    let url;
    const custom = await query(
      'SELECT url FROM necta_result_urls WHERE exam_type = $1 AND year = $2 AND active = TRUE',
      [exam, yearInt]
    );
    if (custom.rows.length > 0) {
      url = custom.rows[0].url;
    } else {
      if (yearInt >= 2020 && yearInt <= 2021) {
        const code = exam === 'csee' ? 's0171' : 'S0171';
        url = `https://maktaba.tetea.org/exam-results/${exam.toUpperCase()}${yearInt}/${code}.htm`;
      } else {
        const code = exam === 'ftna' ? 'S0171' : 's0171';
        url = `https://onlinesys.necta.go.tz/results/${yearInt}/${exam}/results/${code}.htm`;
      }
    }

    let response;
    try {
      response = await axios.get(url, { timeout: 20000 });
    } catch (fetchErr) {
      if (fetchErr.response?.status === 404) {
        return res.status(404).json({ message: 'NECTA result page not found (404). Check the URL in NECTA URLs or try a different year.' });
      }
      throw fetchErr;
    }
    const html = response.data;
    const { candidates } = parseNectaResultsTable(html);

    if (!candidates || candidates.length === 0) {
      return res.json({ message: 'No candidate rows parsed. Table format may differ.', imported: 0 });
    }

    const str = (v, maxLen) => (v == null ? '' : String(v).trim().slice(0, maxLen));

    await query('DELETE FROM necta_subject_grades WHERE exam_type = $1 AND year = $2', [exam, yearInt]);
    await query('DELETE FROM necta_candidates WHERE exam_type = $1 AND year = $2', [exam, yearInt]);

    for (const c of candidates) {
      const candNo = str(c.candidate_no, 100);
      const candName = str(c.candidate_name, 500);
      const sexVal = str(c.sex, 100);
      const divVal = str(c.division, 100);
      await query(
        `INSERT INTO necta_candidates (exam_type, year, candidate_no, candidate_name, sex, division, points)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (exam_type, year, candidate_no) DO UPDATE SET
         candidate_name = EXCLUDED.candidate_name, sex = EXCLUDED.sex, division = EXCLUDED.division, points = EXCLUDED.points`,
        [exam, yearInt, candNo || 'unknown', candName, sexVal, divVal, c.points]
      );
      for (const g of (c.grades || [])) {
        const subjName = str((g.subject_name || '').trim() || 'Subject', 300);
        const gradeVal = str(g.grade, 50);
        if (!gradeVal) continue;
        await query(
          `INSERT INTO necta_subject_grades (exam_type, year, candidate_no, subject_name, grade)
           VALUES ($1, $2, $3, $4, $5)`,
          [exam, yearInt, candNo || 'unknown', subjName, gradeVal]
        );
      }
    }

    res.json({ message: `Imported ${candidates.length} candidates`, imported: candidates.length, url });
  } catch (err) {
    console.error('NECTA import error:', err.message);
    return sendError(res, err, 500);
  }
});

// List exam_type+year we have data for
router.get('/necta/analytics/overview', async (req, res) => {
  try {
    await ensureNectaTables();
    const r = await query(
      'SELECT exam_type, year, COUNT(*) as total FROM necta_candidates GROUP BY exam_type, year ORDER BY year DESC, exam_type'
    );
    res.json({ overview: r.rows });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// Search students (candidates)
router.get('/necta/analytics/students', async (req, res) => {
  try {
    const { exam_type, year, search } = req.query;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    await ensureNectaTables();
    let q = 'SELECT * FROM necta_candidates WHERE exam_type = $1 AND year = $2';
    const params = [exam_type.toLowerCase(), parseInt(year, 10)];
    if (search && search.trim()) {
      params.push('%' + search.trim() + '%');
      q += ' AND (candidate_no ILIKE $3 OR candidate_name ILIKE $3)';
    }
    q += ' ORDER BY candidate_no LIMIT 500';
    const r = await query(q, params);
    res.json({ students: r.rows });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// Subject stats: GPA, count per grade (A/B/C/D/F or I/II/III/IV/0/F) per subject
router.get('/necta/analytics/subject-stats', async (req, res) => {
  try {
    const { exam_type, year } = req.query;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    await ensureNectaTables();
    const exam = exam_type.toLowerCase();
    const yearInt = parseInt(year, 10);
    const grades = await query(
      'SELECT subject_name, grade FROM necta_subject_grades WHERE exam_type = $1 AND year = $2',
      [exam, yearInt]
    );
    const bySubject = {};
    for (const row of (grades.rows || [])) {
      const name = (row.subject_name || 'Unknown').trim();
      if (!bySubject[name]) {
        bySubject[name] = { subject_name: name, count: 0, sumPoints: 0, grade_counts: {} };
      }
      bySubject[name].count++;
      const pt = gradeToPoint(row.grade);
      bySubject[name].sumPoints += pt;
      const g = (row.grade || '').toString().trim().toUpperCase();
      bySubject[name].grade_counts[g] = (bySubject[name].grade_counts[g] || 0) + 1;
    }
    const stats = Object.values(bySubject).map(s => ({
      ...s,
      gpa: s.count > 0 ? Math.round((s.sumPoints / s.count) * 100) / 100 : 0
    }));
    res.json({ subject_stats: stats });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// Subject ranking (by GPA) and overall candidate ranking (by points)
router.get('/necta/analytics/rankings', async (req, res) => {
  try {
    const { exam_type, year } = req.query;
    if (!exam_type || !year) {
      return res.status(400).json({ message: 'exam_type and year required' });
    }
    await ensureNectaTables();
    const exam = exam_type.toLowerCase();
    const yearInt = parseInt(year, 10);
    const candidates = await query(
      'SELECT candidate_no, candidate_name, division, points FROM necta_candidates WHERE exam_type = $1 AND year = $2 ORDER BY points DESC NULLS LAST, candidate_no',
      [exam, yearInt]
    );
    const grades = await query(
      'SELECT subject_name, grade FROM necta_subject_grades WHERE exam_type = $1 AND year = $2',
      [exam, yearInt]
    );
    const subjectPoints = {};
    for (const row of (grades.rows || [])) {
      const name = (row.subject_name || 'Unknown').trim();
      if (!subjectPoints[name]) subjectPoints[name] = [];
      subjectPoints[name].push({ grade: row.grade, point: gradeToPoint(row.grade) });
    }
    const subjectRanking = Object.entries(subjectPoints).map(([name, arr]) => {
      const gpa = arr.length ? arr.reduce((s, x) => s + x.point, 0) / arr.length : 0;
      return { subject_name: name, gpa: Math.round(gpa * 100) / 100, candidates_count: arr.length };
    }).sort((a, b) => b.gpa - a.gpa);
    res.json({
      overall_ranking: (candidates.rows || []).map((c, i) => ({ rank: i + 1, ...c })),
      subject_ranking: subjectRanking
    });
  } catch (e) {
    return sendError(res, e, 500);
  }
});

// ========== ADMINISTRATORS MANAGEMENT ==========

// Get all administrators (for admin panel - includes inactive)
router.get('/administrators', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM administrators ORDER BY display_order, created_at'
    );
    res.json({ administrators: result.rows });
  } catch (error) {
    console.error('Get administrators error:', error);
    return sendError(res, error, 500);
  }
});

// Save administrator (create or update)
router.post('/administrators', upload.single('photo'), async (req, res) => {
  try {
    const { id, name, title, year_started, display_order, active } = req.body;
    
    if (!name || !title) {
      return res.status(400).json({ message: 'name and title are required' });
    }
    
    let photoPath = null;
    let cloudinaryPublicId = null;
    
    // Handle photo upload
    if (req.file) {
      // Get old photo and cloudinary_public_id if updating
      if (id) {
        const oldAdminResult = await query('SELECT photo, cloudinary_public_id FROM administrators WHERE id = $1', [id]);
        const oldPhotoPath = oldAdminResult.rows[0]?.photo;
        const oldCloudinaryPublicId = oldAdminResult.rows[0]?.cloudinary_public_id;

        // Delete old photo from Cloudinary or local storage
        if (oldCloudinaryPublicId) {
          try {
            await cloudinary.uploader.destroy(oldCloudinaryPublicId);
          } catch (err) {
            console.warn('Failed to delete old administrator photo from Cloudinary:', err.message);
          }
        } else if (oldPhotoPath && !oldPhotoPath.startsWith('http')) {
          try {
            const oldFilePath = path.join(__dirname, '../static', oldPhotoPath);
            await fs.unlink(oldFilePath);
          } catch (err) {
            // Old photo file not found or already deleted
          }
        }
      }

      // Upload to Cloudinary ONLY (no local fallback)
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'administrator-photos',
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good', fetch_format: 'auto' }
          ]
        });
        photoPath = result.secure_url;
        cloudinaryPublicId = result.public_id;
        console.log(`✅ Admin photo uploaded to Cloudinary: ${cloudinaryPublicId}`);
      } catch (cloudinaryError) {
        console.error(`❌ Cloudinary upload failed:`, cloudinaryError.message);
        return res.status(500).json({ 
          message: 'Photo upload failed. Cloudinary error.', 
          error: cloudinaryError.message 
        });
      } 
      try { await fs.unlink(req.file.path).catch(() => {}); } catch (_) {}
    } else if (id) {
      // Keep existing photo if updating without new photo
      const existingResult = await query('SELECT photo, cloudinary_public_id FROM administrators WHERE id = $1', [id]);
      photoPath = existingResult.rows[0]?.photo || null;
      cloudinaryPublicId = existingResult.rows[0]?.cloudinary_public_id || null;
    }
    
    const displayOrder = display_order ? parseInt(display_order) : 0;
    const isActive = active === 'true' || active === true;
    
    if (id) {
      // Update existing administrator
      await query(
        `UPDATE administrators 
         SET name = $1, title = $2, year_started = $3, photo = $4, cloudinary_public_id = $5, display_order = $6, active = $7, updated_at = NOW()
         WHERE id = $8`,
        [name, title, year_started || null, photoPath, cloudinaryPublicId, displayOrder, isActive, id]
      );
    } else {
      // Create new administrator
      const newId = uuidv4();
      await query(
        `INSERT INTO administrators (id, name, title, year_started, photo, cloudinary_public_id, display_order, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId, name, title, year_started || null, photoPath, cloudinaryPublicId, displayOrder, isActive]
      );
    }
    
    res.json({ message: `Administrator ${id ? 'updated' : 'created'} successfully` });
  } catch (error) {
    console.error('Save administrator error:', error);
    return sendError(res, error, 500);
  }
});

// Delete administrator
router.delete('/administrators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get photo path and cloudinary_public_id before deleting
    const adminResult = await query('SELECT photo, cloudinary_public_id FROM administrators WHERE id = $1', [id]);
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: 'Administrator not found' });
    }
    
    const photoPath = adminResult.rows[0].photo;
    const cloudinaryPublicId = adminResult.rows[0].cloudinary_public_id;
    
    // Delete photo from Cloudinary or local storage
    if (cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId);
      } catch (err) {
        console.warn('Failed to delete administrator photo from Cloudinary:', err.message);
      }
    } else if (photoPath && !photoPath.startsWith('http')) {
      try {
        const filePath = path.join(__dirname, '../static', photoPath);
        await fs.unlink(filePath);
      } catch (err) {
        // Photo file not found or already deleted
      }
    }
    
    // Delete administrator
    await query('DELETE FROM administrators WHERE id = $1', [id]);
    
    res.json({ message: 'Administrator deleted successfully' });
  } catch (error) {
    console.error('Delete administrator error:', error);
    return sendError(res, error, 500);
  }
});

// ========== STUDENT PASS ID MANAGEMENT ==========

// Generate Pass ID (6 characters: 3 numbers + 3 letters)
const generatePassId = () => {
  const numbers = '0123456789';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O to avoid confusion
  let passId = '';
  
  // 3 random numbers
  for (let i = 0; i < 3; i++) {
    passId += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  // 3 random letters
  for (let i = 0; i < 3; i++) {
    passId += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  return passId;
};

// Get Pass IDs for a specific form
router.get('/pass-ids/:form', async (req, res) => {
  try {
    const { form } = req.params;
    const { month, year } = req.query;
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    let sql = `
      SELECT 
        sp.id,
        sp.adm_no,
        sp.level,
        sp.stream,
        sp.year,
        sp.month,
        sp.pass_id,
        sp.created_at,
        s.first_name,
        s.middle_name,
        s.surname
      FROM student_pass_ids sp
      LEFT JOIN students s ON sp.adm_no = s.adm_no 
        AND sp.level = s.level 
        AND sp.stream = s.stream 
        AND sp.year = s.year
      WHERE UPPER(TRIM(sp.level)) = UPPER(TRIM($1))
    `;
    const params = [normalizedForm];
    
    if (month) {
      sql += ' AND sp.month = $2';
      params.push(month);
    }
    
    if (year) {
      const paramIndex = month ? 3 : 2;
      sql += ` AND sp.year = $${paramIndex}`;
      params.push(parseInt(year));
    }
    
    sql += ' ORDER BY sp.year DESC, sp.month DESC, sp.adm_no';
    
    const result = await query(sql, params);
    
    res.json({ passIds: result.rows });
  } catch (error) {
    console.error('Get Pass IDs error:', error);
    return sendError(res, error, 500);
  }
});

// Generate Pass IDs for all students in a form for a specific month
router.post('/pass-ids/generate', async (req, res) => {
  try {
    const { form, month, year } = req.body;
    
    if (!form || !month || !year) {
      return res.status(400).json({ message: 'form, month, and year are required' });
    }
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    // Get all active students for the form
    const studentsResult = await query(
      `SELECT DISTINCT adm_no, level, stream, year, first_name, middle_name, surname
       FROM students
       WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND year = $2 AND status != 'ARCHIVED'
       ORDER BY adm_no`,
      [normalizedForm, parseInt(year)]
    );
    
    if (studentsResult.rows.length === 0) {
      return res.json({ message: 'No students found', generated: 0 });
    }
    
    let generated = 0;
    let updated = 0;
    
    for (const student of studentsResult.rows) {
      // Check if Pass ID already exists for this student/month/year
      const existingResult = await query(
        `SELECT id FROM student_pass_ids 
         WHERE adm_no = $1 AND level = $2 AND year = $3 AND month = $4`,
        [student.adm_no, student.level, student.year, month]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing Pass ID (generate new one)
        const newPassId = generatePassId();
        await query(
          `UPDATE student_pass_ids 
           SET pass_id = $1, created_at = NOW() 
           WHERE adm_no = $2 AND level = $3 AND year = $4 AND month = $5`,
          [newPassId, student.adm_no, student.level, student.year, month]
        );
        updated++;
      } else {
        // Create new Pass ID
        const newPassId = generatePassId();
        await query(
          `INSERT INTO student_pass_ids (adm_no, level, stream, year, month, pass_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [student.adm_no, student.level, student.stream || null, student.year, month, newPassId]
        );
        generated++;
      }
    }
    
    res.json({ 
      message: `Generated ${generated} new Pass IDs and updated ${updated} existing ones`,
      generated,
      updated,
      total: generated + updated
    });
  } catch (error) {
    console.error('Generate Pass IDs error:', error);
    return sendError(res, error, 500);
  }
});

// Regenerate Pass ID for a specific student
router.post('/pass-ids/regenerate', async (req, res) => {
  try {
    const { adm_no, form, month, year } = req.body;
    
    if (!adm_no || !form || !month || !year) {
      return res.status(400).json({ message: 'adm_no, form, month, and year are required' });
    }
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    const newPassId = generatePassId();
    
    await query(
      `INSERT INTO student_pass_ids (adm_no, level, year, month, pass_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (adm_no, level, year, month)
       DO UPDATE SET pass_id = EXCLUDED.pass_id, created_at = NOW()`,
      [adm_no, normalizedForm, parseInt(year), month, newPassId]
    );
    
    res.json({ message: 'Pass ID regenerated successfully', pass_id: newPassId });
  } catch (error) {
    console.error('Regenerate Pass ID error:', error);
    return sendError(res, error, 500);
  }
});

// ========== AI MATTERS (admin-only: upload PDF/CSV/DOCX, chat over content) ==========

async function ensureAiMattersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ai_matters_documents (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      extracted_text TEXT,
      mime_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `);
}

router.get('/ai-matters/documents', async (req, res) => {
  try {
    await ensureAiMattersTable();
    const result = await query(
      'SELECT id, name, file_path, mime_type, created_at FROM ai_matters_documents ORDER BY created_at DESC'
    );
    res.json({ documents: result.rows });
  } catch (error) {
    console.error('AI Matters list error:', error);
    return sendError(res, error, 500);
  }
});

router.post('/ai-matters/upload', documentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    await ensureAiMattersTable();
    const buffer = await fs.readFile(req.file.path);
    const extracted = await extractText(buffer, req.file.originalname || req.file.filename);
    const userId = req.user?.id || null;
    await query(
      `INSERT INTO ai_matters_documents (name, file_path, extracted_text, mime_type, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.file.originalname || req.file.filename, req.file.filename, extracted || null, req.file.mimetype || null, userId]
    );
    const inserted = await query(
      'SELECT id, name, file_path, mime_type, created_at FROM ai_matters_documents ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json({ document: inserted.rows[0] });
  } catch (error) {
    console.error('AI Matters upload error:', error);
    if (req.file && req.file.path) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    return sendError(res, error, 500);
  }
});

router.delete('/ai-matters/documents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
    const row = await query('SELECT file_path FROM ai_matters_documents WHERE id = $1', [id]);
    if (row.rows.length === 0) return res.status(404).json({ message: 'Document not found' });
    const filePath = path.join(aiMattersPath, row.rows[0]?.file_path);
    try { await fs.unlink(filePath); } catch (_) {}
    await query('DELETE FROM ai_matters_documents WHERE id = $1', [id]);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('AI Matters delete error:', error);
    return sendError(res, error, 500);
  }
});

router.post('/ai-matters/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const userMessage = message.trim().slice(0, 4000);
    if (!userMessage) return res.status(400).json({ message: 'Message cannot be empty' });
    if (!getClient()) {
      return res.status(503).json({
        reply: 'AI is not configured. Please set ANTHROPIC_API_KEY in the server environment.'
      });
    }
    await ensureAiMattersTable();
    const docs = await query(
      'SELECT name, extracted_text FROM ai_matters_documents WHERE extracted_text IS NOT NULL AND extracted_text != \'\' ORDER BY created_at DESC'
    );
    const context = (docs.rows || []).map(d => `--- Document: ${d.name} ---\n${(d.extracted_text || '').slice(0, 150000)}`).join('\n\n');
    let faqList = '';
    try {
      const faqsResult = await query(
        'SELECT question, answer, category FROM faqs WHERE active = TRUE ORDER BY display_order, created_at'
      );
      faqList = (faqsResult.rows || []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
    } catch (e) {
      faqList = '';
    }
    let nectaSummary = '';
    try {
      await ensureNectaTables();
      nectaSummary = await getNectaSummaryForAI(query, { includeTopCandidates: true });
    } catch (e) {
      nectaSummary = 'No NECTA data imported yet. Use Admin → NECTA URLs and Import to fetch results.';
    }
    const faqSection = faqList ? `\n\nFAQs (Admin → FAQs; use when relevant):\n${faqList}` : '';
    const systemPrompt = `You are the assistant for the school admin of Arusha Catholic Seminary. Use ONLY the content provided below. Do not invent data.

Rules:
1. Base every answer on the FAQs, attached documents, and NECTA summary below. If the answer is not there, say "I don't have that information in the provided content."
2. When you use a specific source, cite it briefly (e.g. "According to the FAQs...", "From [document name]...", "From NECTA summary...").
3. Format clearly: use bullet points, numbered lists, or short paragraphs where they help.
4. For NECTA: the summary includes exam type, year, subject GPAs, grade counts, and (for admin) top 15 candidates by points. Use it for exam-related questions.
5. Answer in the same language the user used (English or Swahili). If unclear, use English.

FAQs:
${faqSection}

Document content (AI Matters uploads):
${context || '(No documents uploaded yet. Upload PDF, CSV, or Word files in AI Matters.)'}

NECTA data:
${nectaSummary}`;
    const reply = await callClaude(systemPrompt, userMessage, 4096);
    res.json({ reply: (reply || '').trim() || 'I could not generate an answer. Please try again.' });
  } catch (error) {
    console.error('AI Matters chat error:', error);
    return sendError(res, { message: 'Something went wrong. Please try again or contact support.' }, 500);
  }
});

module.exports = router;
