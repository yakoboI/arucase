/**
 * Public Website Routes
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { updateVisitorStats, getVisitorStatKeys } = require('../utils/visitorStats');
const axios = require('axios');
const cheerio = require('cheerio');
const {
  calculateGrade,
  calculateWeightedTotal,
  calculateOverallAverage
} = require('../utils/calculations');
const { normalizeStream } = require('../utils/streamNormalizer');
const { sendError } = require('../utils/safeError');
const { resolvePublicPageSlug } = require('../utils/publicPageSlugs');
const { cacheRoutes } = require('../middleware/cache');
const { JWT_SECRET } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function normalizeEmail(email) {
  return (email || '').toString().trim().toLowerCase();
}

function normalizePhone(phone) {
  return (phone || '').toString().trim();
}

function generateApplicantToken(applicant) {
  const expiresIn = process.env.JWT_ACCESS_TOKEN_EXPIRES?.trim() || '7d';
  return jwt.sign(
    { user_id: applicant.id, role: 'applicant' },
    JWT_SECRET,
    { expiresIn }
  );
}

function requireApplicantAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Tafadhali ingia tena.' });
    const token = authHeader.split(' ')[1] || authHeader;
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'applicant' || !decoded.user_id) {
      return res.status(401).json({ message: 'Kuingia si halali.' });
    }
    req.applicant = decoded;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ message: 'Muda wa kuingia umeisha, ingia tena.' });
    return res.status(401).json({ message: 'Kuingia si halali.' });
  }
}

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
  // Drop UNIQUE(applicant_id) if it exists
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

  // Add re-application tracking fields
  await query(`ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS application_no INTEGER DEFAULT 1`);
  await query(`ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS is_reapplication BOOLEAN DEFAULT FALSE`);
  await query(`ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS previous_application_id UUID`);

  await query(`CREATE INDEX IF NOT EXISTS idx_admission_applications_applicant ON admission_applications(applicant_id, submitted_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_admission_applications_status ON admission_applications(status)`);
}

// Homepage data
router.get('/homepage', async (req, res) => {
  try {
    // Get website settings
    const settingsResult = await query('SELECT * FROM website_settings WHERE id = 1');
    const settings = settingsResult.rows[0] || {};
    
    // Get school logo from school_logo table and add to settings
    try {
      const logoResult = await query('SELECT logo_image_path FROM school_logo WHERE id = 1');
      if (logoResult.rows.length > 0 && logoResult.rows[0] && logoResult.rows[0].logo_image_path) {
        settings.school_logo = logoResult.rows[0].logo_image_path;
      }
    } catch (logoError) {
      // If school_logo table doesn't exist or has no logo, use default or keep existing
    }
    
    // Get gallery photos (limit 12)
    const galleryResult = await query(
      'SELECT * FROM gallery_photos ORDER BY created_at DESC LIMIT 12'
    );
    const gallery_photos = galleryResult.rows;
    
    // Get active FAQs (limit 5)
    const faqsResult = await query(
      'SELECT * FROM faqs WHERE active = TRUE ORDER BY display_order, created_at LIMIT 5'
    );
    const faqs = faqsResult.rows;
    
    // Get active administrators
    const adminResult = await query(
      'SELECT * FROM administrators WHERE active = TRUE ORDER BY display_order, created_at'
    );
    const administrators = adminResult.rows;
    
    // Get recent announcements (limit 5)
    const announcementsResult = await query(
      'SELECT * FROM public_announcements WHERE active = TRUE ORDER BY created_at DESC LIMIT 5'
    );
    const announcements = announcementsResult.rows;

    // School stats for homepage (current enrollment + graduates since founding)
    // Use calendar year (not MAX(year) from DB — Form VI Second Term rows can be stored as year+1)
    const currentYear = new Date().getFullYear();
    let current_students = 0;
    const enrolledResult = await query(
      `SELECT COALESCE(SUM(term_total), 0) AS count
       FROM (
         SELECT
           term,
           SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM I' THEN 1 ELSE 0 END) +
           SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM II' THEN 1 ELSE 0 END) +
           SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM III' THEN 1 ELSE 0 END) +
           SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM IV' THEN 1 ELSE 0 END) +
           SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM V' THEN 1 ELSE 0 END) +
           SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM VI' THEN 1 ELSE 0 END) AS term_total
         FROM students
         WHERE year = $1
         GROUP BY term
       ) per_term`,
      [currentYear]
    );
    current_students = parseInt(enrolledResult.rows[0]?.count, 10) || 0;

    // Wahitimu tangu 1967: base (pre-2025) + Form I intake + Form VI (graduating class) per year from 2025
    const GRADUATES_BASE_BEFORE_2025 = 2475;
    const GRADUATE_COUNT_START_YEAR = 2025;
    let form_one_since_2025 = 0;
    let form_six_since_2025 = 0;
    const formSixThroughYear = currentYear + 1; // Form VI Second Term often stored as year + 1
    if (currentYear >= GRADUATE_COUNT_START_YEAR) {
      const graduateCohortResult = await query(
        `SELECT
           COALESCE(SUM(CASE WHEN lvl = 'FORM I' THEN year_count ELSE 0 END), 0) AS form_one_total,
           COALESCE(SUM(CASE WHEN lvl = 'FORM VI' THEN year_count ELSE 0 END), 0) AS form_six_total
         FROM (
           SELECT year, UPPER(TRIM(level)) AS lvl, COUNT(DISTINCT adm_no) AS year_count
           FROM students
           WHERE UPPER(TRIM(level)) IN ('FORM I', 'FORM VI')
             AND year >= $1
             AND (
               (UPPER(TRIM(level)) = 'FORM I' AND year <= $2)
               OR (UPPER(TRIM(level)) = 'FORM VI' AND year <= $3)
             )
           GROUP BY year, UPPER(TRIM(level))
         ) cohort_by_year`,
        [GRADUATE_COUNT_START_YEAR, currentYear, formSixThroughYear]
      );
      const cohort = graduateCohortResult.rows[0] || {};
      form_one_since_2025 = parseInt(cohort.form_one_total, 10) || 0;
      form_six_since_2025 = parseInt(cohort.form_six_total, 10) || 0;
    }
    const graduates_since_1967 =
      GRADUATES_BASE_BEFORE_2025 + form_one_since_2025 + form_six_since_2025;

    const school_stats = {
      graduates_since_1967,
      graduates_base: GRADUATES_BASE_BEFORE_2025,
      form_one_since_2025,
      form_six_since_2025,
      current_students,
      academic_year: currentYear,
    };
    
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 min cache for fast repeat loads on slow/mobile
    res.json({
      settings,
      gallery_photos,
      faqs,
      administrators,
      announcements,
      school_stats,
    });
  } catch (error) {
    console.error('Homepage error:', error);
    return sendError(res, error, 500);
  }
});

// ========== ADMISSIONS (APPLICANT PORTAL) ==========

// Register applicant (email + phone)
router.post('/admissions/register', async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const { full_name, email, phone, password } = req.body || {};

    const fullName = (full_name || '').toString().trim();
    const emailNorm = normalizeEmail(email);
    const phoneNorm = normalizePhone(phone);
    const pass = (password || '').toString();

    if (!fullName || !emailNorm || !phoneNorm || !pass) {
      return res.status(400).json({ message: 'Jaza majina kamili, barua pepe, namba ya simu na nenosiri.' });
    }
    if (pass.length < 6) {
      return res.status(400).json({ message: 'Nenosiri liwe angalau herufi 6.' });
    }

    const existing = await query(
      'SELECT id FROM admission_applicants WHERE email = $1 OR phone = $2 LIMIT 1',
      [emailNorm, phoneNorm]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Barua pepe au namba hii ya simu tayari imesajiliwa.' });
    }

    const passwordHash = await bcrypt.hash(pass, 10);
    const inserted = await query(
      `INSERT INTO admission_applicants (full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, status, created_at`,
      [fullName, emailNorm, phoneNorm, passwordHash]
    );

    const applicant = inserted.rows[0];
    const token = generateApplicantToken(applicant);
    res.status(201).json({ token, applicant });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Login applicant (email or phone)
router.post('/admissions/login', async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const { identifier, password } = req.body || {};
    const idVal = (identifier || '').toString().trim();
    const pass = (password || '').toString();
    if (!idVal || !pass) {
      return res.status(400).json({ message: 'Andika barua pepe au namba ya simu pamoja na nenosiri.' });
    }

    const emailNorm = normalizeEmail(idVal);
    const phoneNorm = normalizePhone(idVal);

    const result = await query(
      `SELECT id, full_name, email, phone, status, password_hash
       FROM admission_applicants
       WHERE email = $1 OR phone = $2
       LIMIT 1`,
      [emailNorm, phoneNorm]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Barua pepe, simu au nenosiri si sahihi.' });
    }

    const applicant = result.rows[0];
    if ((applicant.status || 'active') !== 'active') {
      return res.status(403).json({ message: 'Akaunti si hai.' });
    }

    const ok = await bcrypt.compare(pass, applicant.password_hash);
    if (!ok) return res.status(401).json({ message: 'Barua pepe, simu au nenosiri si sahihi.' });

    const token = generateApplicantToken(applicant);
    const safeApplicant = {
      id: applicant.id,
      full_name: applicant.full_name,
      email: applicant.email,
      phone: applicant.phone,
      status: applicant.status,
    };
    res.json({ token, applicant: safeApplicant });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get my application (or null)
router.get('/admissions/application/mine', requireApplicantAuth, async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const applicantId = req.applicant.user_id;
    const r = await query(
      `SELECT a.*, ap.full_name, ap.email, ap.phone
       FROM admission_applications a
       JOIN admission_applicants ap ON ap.id = a.applicant_id
       WHERE a.applicant_id = $1
       ORDER BY a.submitted_at DESC
       LIMIT 1`,
      [applicantId]
    );
    if (r.rows.length === 0) return res.json({ application: null });
    return res.json({ application: r.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Create a new application each submission (re-application supported)
router.post('/admissions/application', requireApplicantAuth, async (req, res) => {
  try {
    await ensureAdmissionsTables();
    const applicantId = req.applicant.user_id;
    const {
      education_level,
      is_transfer = false,
      previous_school = null,
      desired_entry,
      region = null,
      district = null,
      message = null,
      documents = null,
    } = req.body || {};

    const edu = (education_level || '').toString().trim().toUpperCase();
    const desired = (desired_entry || '').toString().trim();
    if (!edu || !desired) {
      return res.status(400).json({ message: 'Chagua kiwango cha elimu na andika unataka kujiunga kidato/darasa gani.' });
    }

    const allowedEdu = new Set(['PRIMARY', 'FORM_IV', 'FORM_VI', 'OTHER']);
    if (!allowedEdu.has(edu)) {
      return res.status(400).json({ message: 'Kiwango cha elimu ulichochagua si halali.' });
    }

    const prev = await query(
      `SELECT id, application_no
       FROM admission_applications
       WHERE applicant_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [applicantId]
    );
    const previousApplicationId = prev.rows[0]?.id || null;
    const previousNo = parseInt(prev.rows[0]?.application_no || 0, 10) || 0;
    const nextNo = previousNo + 1;
    const isReapplication = Boolean(previousApplicationId);

    const inserted = await query(
      `INSERT INTO admission_applications
        (applicant_id, education_level, is_transfer, previous_school, desired_entry, region, district, message, documents,
         status, admin_feedback, application_no, is_reapplication, previous_application_id, submitted_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         'pending', NULL, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        applicantId,
        edu,
        Boolean(is_transfer),
        previous_school,
        desired,
        region,
        district,
        message,
        documents,
        nextNo,
        isReapplication,
        previousApplicationId,
      ]
    );
    res.status(201).json({ message: 'Maombi yamewasilishwa.', application: inserted.rows[0] });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get announcements
router.get('/announcements', cacheRoutes.publicData, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await query(
      'SELECT * FROM public_announcements WHERE active = TRUE ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ announcements: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Events routes removed

// Get gallery photos
router.get('/gallery', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await query(
      'SELECT * FROM gallery_photos ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ photos: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get alumni
router.get('/alumni', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await query(
      "SELECT * FROM alumni WHERE status = 'approved' ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ alumni: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get FAQs
router.get('/faqs', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM faqs WHERE active = TRUE ORDER BY display_order, created_at'
    );
    res.json({ faqs: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Public chatbot – replaces FAQ for common questions. No student/admission/credentials data.
const { getClient, callClaude } = require('../utils/anthropic');
const { getNectaSummaryForAI } = require('../utils/nectaAnalyticsForAI');
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    const userMessage = message.trim().slice(0, 2000);
    if (!userMessage) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (!getClient()) {
      return res.status(503).json({
        error: 'Chat is not configured',
        reply: 'Sorry, the assistant is not available right now. Please contact the school directly for questions.',
      });
    }
    const faqsResult = await query(
      'SELECT question, answer, category FROM faqs WHERE active = TRUE ORDER BY display_order, created_at'
    );
    const faqList = (faqsResult.rows || []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');

    let docContent = '';
    try {
      const docsResult = await query(
        'SELECT name, extracted_text FROM ai_matters_documents WHERE extracted_text IS NOT NULL AND extracted_text != \'\' ORDER BY created_at DESC'
      );
      docContent = (docsResult.rows || [])
        .map((d) => `--- Document: ${d.name} ---\n${(d.extracted_text || '').slice(0, 150000)}`)
        .join('\n\n');
    } catch (e) {
      // ai_matters_documents table may not exist yet
    }

    let publicPagesContent = '';
    try {
      const pagesResult = await query(
        'SELECT page_name, title, html_content FROM public_pages WHERE html_content IS NOT NULL AND html_content != \'\''
      );
      publicPagesContent = (pagesResult.rows || [])
        .map((p) => {
          const $ = cheerio.load(p.html_content || '');
          const text = ($('body').length ? $('body').text() : $.root().text()).replace(/\s+/g, ' ').trim().slice(0, 80000);
          return `--- Public page: ${p.title || p.page_name} (${p.page_name}) ---\n${text}`;
        })
        .filter((block) => block.length > 30)
        .join('\n\n');
    } catch (e) {
      // public_pages table may not exist
    }

    let nectaSummary = '';
    try {
      nectaSummary = await getNectaSummaryForAI(query, { includeTopCandidates: false });
    } catch (e) {
      nectaSummary = 'No NECTA data available.';
    }
    const nectaSection = nectaSummary ? `\n\n${nectaSummary}` : '';
    const docSection = docContent
      ? `\n\nAttached documents (AI Matters – search and use when relevant):\n${docContent}`
      : '';
    const publicPagesSection = publicPagesContent
      ? `\n\nPublic website pages (search and use when relevant):\n${publicPagesContent}`
      : '';
    const systemPrompt = `You are the friendly, professional assistant for Arusha Catholic Seminary (Arusha, Tanzania). Your role is to answer questions about the school using ONLY the content provided below.

Rules:
1. Use only the FAQs, attached documents, public pages, and NECTA summary below. Do not invent facts or figures.
2. When you use specific information, briefly say where it comes from (e.g. "According to our FAQs...", "On the fees page...").
3. Answer in the same language the user used (English or Swahili). If unclear, use English.
4. Be concise and clear. Use short paragraphs or bullet points when it helps.
5. Do NOT mention individual student names, admission numbers, or any confidential data. You MAY use aggregated NECTA data (totals, subject GPAs, grade counts by year).
6. If the question is not covered by the content below, say so and suggest contacting the school: arucase@gmail.com or the Contact page.

School identity: Arusha Catholic Seminary. Contact: arucase@gmail.com.

FAQ content:
${faqList || 'No FAQ content available.'}${docSection}${publicPagesSection}${nectaSection}

If you cannot find an answer above, reply that the user should contact the school (arucase@gmail.com or the Contact page).`;

    const reply = await callClaude(systemPrompt, userMessage, 2048);
    res.json({ reply: (reply || '').trim() || "I couldn't find an answer. Please contact the school directly." });
  } catch (error) {
    console.error('Public chat error:', error);
    return sendError(res, { message: 'Something went wrong. Please try again or contact the school directly.' }, 500);
  }
});

// Get administrators
router.get('/administrators', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM administrators WHERE active = TRUE ORDER BY display_order, created_at'
    );
    res.json({ administrators: result.rows });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Public staff profiles (teachers + non-teaching)
router.get('/staff-profiles', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, role_title, is_teaching, professional_subjects, teaching_since_year,
              subjects_teaching, class_teacher_for, other_duties, contact_phone, contact_email,
              photo_path, profile_summary, display_order
       FROM staff_profiles
       WHERE active = TRUE
       ORDER BY is_teaching DESC, display_order ASC, created_at DESC`
    );
    res.json({ staff_profiles: result.rows || [] });
  } catch (error) {
    // Table may not exist yet on old DBs; fail soft for public page
    if (error.code === '42P01') {
      return res.json({ staff_profiles: [] });
    }
    return sendError(res, error, 500);
  }
});

// Get public page (returns default empty page for known slugs when not in DB)
const KNOWN_PAGE_SLUGS = [
  'homepage',
  'school-fee',
  'fees',
  'about',
  'contact',
  'admissions',
  'staff',
  'student-life',
  'student_life',
  'student_report',
  'privacy',
];

router.get('/page/:pageName', async (req, res) => {
  try {
    const { pageName } = req.params;
    const canonical = resolvePublicPageSlug(pageName);
    let result;
    try {
      result = await query(
        'SELECT * FROM public_pages WHERE page_name = $1 OR page_name = $2 ORDER BY CASE WHEN page_name = $1 THEN 0 ELSE 1 END LIMIT 1',
        [canonical, pageName]
      );
    } catch (dbError) {
      // Table might not exist yet; return default for known slugs
      if (KNOWN_PAGE_SLUGS.includes(pageName) || KNOWN_PAGE_SLUGS.includes(canonical)) {
        return res.json({ page: { page_name: canonical, html_content: null, content: null } });
      }
      throw dbError;
    }
    
    if (result.rows.length === 0) {
      if (KNOWN_PAGE_SLUGS.includes(pageName) || KNOWN_PAGE_SLUGS.includes(canonical)) {
        return res.json({ page: { page_name: canonical, html_content: null, content: null } });
      }
      return res.status(404).json({ message: 'Page not found' });
    }
    
    res.json({ page: { ...result.rows[0], page_name: canonical } });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Testimony routes removed

// Submit alumni
router.post('/alumni/submit', async (req, res) => {
  try {
    const {
      official_names, year_start, year_end, class_level,
      current_position, phone, email, social_media, philosophy, photo
    } = req.body;
    
    const id = `alumni_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await query(
      `INSERT INTO alumni (id, official_names, year_start, year_end, class_level,
       current_position, phone, email, social_media, philosophy, photo, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')`,
      [id, official_names, year_start, year_end, class_level,
       current_position, phone, email, social_media, philosophy, photo]
    );
    
    res.status(201).json({ message: 'Alumni information submitted successfully', id });
  } catch (error) {
    return sendError(res, error, 500);
  }
});


// Track visitor (dedicated endpoint)
router.post('/track-visitor', async (req, res) => {
  try {
    await updateVisitorStats();
    res.json({ success: true, message: 'Visitor tracked' });
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return sendError(res, error, 500);
  }
});

// Get visitor stats
router.get('/visitor-stats', async (req, res) => {
  try {
    const { today, week } = getVisitorStatKeys();
    
    const stats = {};
    
    // Get total
    const totalResult = await query(
      "SELECT stat_value FROM visitor_stats WHERE stat_type = 'total' AND stat_key = 'total_visits'"
    );
    stats.total = totalResult.rows[0]?.stat_value || 0;
    
    // Get today
    const todayResult = await query(
      'SELECT stat_value FROM visitor_stats WHERE stat_type = $1 AND stat_key = $2',
      ['daily', today]
    );
    stats.today = todayResult.rows[0]?.stat_value || 0;
    
    // Get this week
    const weekResult = await query(
      'SELECT stat_value FROM visitor_stats WHERE stat_type = $1 AND stat_key = $2',
      ['weekly', week]
    );
    stats.week = weekResult.rows[0]?.stat_value || 0;
    
    res.json({ stats });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get NECTA URL (check database first, fallback to generated)
router.get('/necta-url/:examType/:year', async (req, res) => {
  try {
    const { examType, year } = req.params;
    const yearInt = parseInt(year);
    
    // First, check if custom URL exists in database
    const customUrlResult = await query(
      'SELECT url FROM necta_result_urls WHERE exam_type = $1 AND year = $2 AND active = TRUE',
      [examType.toLowerCase(), yearInt]
    );
    
    if (customUrlResult.rows.length > 0 && customUrlResult.rows[0]) {
      return res.json({ url: customUrlResult.rows[0].url, source: 'custom' });
    }
    
    // Fallback to generated URL
    let url;
    if (yearInt >= 2020 && yearInt <= 2021) {
      const examUpper = examType.toUpperCase();
      const schoolCode = examType === 'csee' ? 's0171' : 'S0171';
      url = `https://maktaba.tetea.org/exam-results/${examUpper}${yearInt}/${schoolCode}.htm`;
    } else {
      const schoolCode = examType === 'ftna' ? 'S0171' : 's0171';
      url = `https://onlinesys.necta.go.tz/results/${yearInt}/${examType}/results/${schoolCode}.htm`;
    }
    
    res.json({ url, source: 'generated' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Fetch NECTA results
router.post('/necta-results', async (req, res) => {
  try {
    const { exam_type, year } = req.body;
    
    if (!exam_type || !year) {
      return res.status(400).json({ success: false, message: 'Missing exam_type or year' });
    }
    
    // Validate exam_type
    if (!['ftna', 'csee', 'acsee'].includes(exam_type)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid exam_type: ${exam_type}. Must be ftna, csee, or acsee` 
      });
    }
    
    // Validate year - dynamic ranges based on exam type
    const yearInt = parseInt(year);
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;
    
    // ACSEE (Form VI) starts from 2026, FTNA/CSEE start from 2020
    const minYear = exam_type === 'acsee' ? 2026 : 2020;
    
    if (isNaN(yearInt) || yearInt < minYear || yearInt > maxYear) {
      return res.status(400).json({ 
        success: false, 
        message: `Year must be between ${minYear} and ${maxYear} for ${exam_type.toUpperCase()}` 
      });
    }
    
    // Check for custom URL first, then fallback to generated
    let url;
    const customUrlResult = await query(
      'SELECT url FROM necta_result_urls WHERE exam_type = $1 AND year = $2 AND active = TRUE',
      [exam_type.toLowerCase(), yearInt]
    );
    
    if (customUrlResult.rows.length > 0 && customUrlResult.rows[0]) {
      url = customUrlResult.rows[0].url;
    } else {
      // Build URL - different format for 2020 and 2021, and different case sensitivity per exam type
      if (yearInt >= 2020 && yearInt <= 2021) {
        // Use TETEA archive for 2020 and 2021
        // CSEE uses lowercase s0171, FTNA and ACSEE use uppercase S0171
        const examUpper = exam_type.toUpperCase();
        const schoolCode = exam_type === 'csee' ? 's0171' : 'S0171';
        url = `https://maktaba.tetea.org/exam-results/${examUpper}${yearInt}/${schoolCode}.htm`;
      } else {
        // Use current NECTA system for 2022+
        const schoolCode = exam_type === 'ftna' ? 'S0171' : 's0171';
        url = `https://onlinesys.necta.go.tz/results/${yearInt}/${exam_type}/results/${schoolCode}.htm`;
      }
    }
    
    // Fetch the HTML page
    const response = await axios.get(url, { timeout: 15000 });
    
    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      
      const stats = {
        total_registered: 0,
        division_i: 0,
        division_ii: 0,
        division_iii: 0,
        division_iv: 0,
        division_0: 0
      };
      
      // Find the division performance summary table
      $('table').each((_, table) => {
        const rows = $(table).find('tr');
        
        rows.each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 6) {
            const firstCell = $(cells[0]).text().trim().toUpperCase();
            if (['T', 'TOTAL', 'TOT'].includes(firstCell)) {
              // Extract division counts
              try {
                stats.division_i = parseInt($(cells[1]).text().trim()) || 0;
                stats.division_ii = parseInt($(cells[2]).text().trim()) || 0;
                stats.division_iii = parseInt($(cells[3]).text().trim()) || 0;
                stats.division_iv = parseInt($(cells[4]).text().trim()) || 0;
                stats.division_0 = parseInt($(cells[5]).text().trim()) || 0;
                stats.total_registered = stats.division_i + stats.division_ii + 
                                        stats.division_iii + stats.division_iv + stats.division_0;
                return false; // Break out of loop
              } catch (err) {
                // Continue to next row
              }
            }
          }
        });
        
        // If we found stats, stop searching
        if (stats.total_registered > 0) {
          return false;
        }
      });
      
      // Alternative: Look for REGIST column in another table
      if (stats.total_registered === 0) {
        $('table').each((_, table) => {
          const rows = $(table).find('tr');
          const headers = [];
          
          rows.each((rowIdx, row) => {
            const ths = $(row).find('th');
            if (ths.length > 0) {
              // This is a header row
              ths.each((_, th) => {
                headers.push($(th).text().trim().toUpperCase());
              });
            } else {
              const cells = $(row).find('td');
              if (cells.length >= 6 && headers.length > 0) {
                // Try to find REGIST column
                const registIdx = headers.indexOf('REGIST');
                if (registIdx >= 0 && registIdx < cells.length) {
                  try {
                    stats.total_registered = parseInt($(cells[registIdx]).text().trim()) || 0;
                    
                    // Look for division columns
                    const div1Idx = headers.indexOf('DIV I');
                    const div2Idx = headers.indexOf('DIV II');
                    const div3Idx = headers.indexOf('DIV III');
                    const div4Idx = headers.indexOf('DIV IV');
                    const div0Idx = headers.indexOf('DIV 0');
                    
                    if (div1Idx >= 0) stats.division_i = parseInt($(cells[div1Idx]).text().trim()) || 0;
                    if (div2Idx >= 0) stats.division_ii = parseInt($(cells[div2Idx]).text().trim()) || 0;
                    if (div3Idx >= 0) stats.division_iii = parseInt($(cells[div3Idx]).text().trim()) || 0;
                    if (div4Idx >= 0) stats.division_iv = parseInt($(cells[div4Idx]).text().trim()) || 0;
                    if (div0Idx >= 0) stats.division_0 = parseInt($(cells[div0Idx]).text().trim()) || 0;
                    
                    return false; // Break
                  } catch (err) {
                    // Continue
                  }
                }
              }
            }
          });
          
          if (stats.total_registered > 0) {
            return false;
          }
        });
      }
      
      res.json({ success: true, stats });
    } else {
      res.status(response.status).json({ 
        success: false, 
        message: `NECTA website returned status ${response.status}` 
      });
    }
  } catch (error) {
    console.error('NECTA results error:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      res.status(503).json({ 
        success: false, 
        message: 'Could not connect to NECTA website. Please try again later or access results directly via the links.' 
      });
    } else if (error.response) {
      res.status(error.response.status).json({ 
        success: false, 
        message: `NECTA website returned error: ${error.response.status}. Results may not be available for this year/exam type.` 
      });
    } else {
      return sendError(res, error, 500);
    }
  }
});

// ========== STUDENT PORTAL ==========

// Student login (verify Pass ID)
router.post('/student/login', async (req, res) => {
  try {
    const { adm_no, year, pass_id } = req.body;
    
    if (!adm_no || !year || !pass_id) {
      return res.status(400).json({ message: 'adm_no, year, and pass_id are required' });
    }
    
    // Find matching Pass ID
    const passIdResult = await query(
      `SELECT sp.*, s.first_name, s.middle_name, s.surname, s.level, s.stream
       FROM student_pass_ids sp
       JOIN students s ON sp.adm_no = s.adm_no 
         AND sp.level = s.level 
         AND sp.year = s.year
       WHERE sp.adm_no = $1 AND sp.year = $2 AND sp.pass_id = $3
       ORDER BY sp.created_at DESC
       LIMIT 1`,
      [adm_no, parseInt(year), pass_id.toUpperCase()]
    );
    
    if (passIdResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your Admission Number, Year, and Pass ID.' });
    }
    
    const studentData = passIdResult.rows[0];
    
    res.json({
      success: true,
      student: {
        adm_no: studentData.adm_no,
        name: `${studentData.first_name} ${studentData.middle_name} ${studentData.surname}`,
        level: studentData.level,
        stream: studentData.stream,
        year: studentData.year
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    return sendError(res, error, 500);
  }
});

// Get available months and terms for a student
router.get('/student/:admNo/months', async (req, res) => {
  try {
    const { admNo } = req.params;
    const { year } = req.query;
    
    if (!year) {
      return res.status(400).json({ message: 'year is required' });
    }
    
    // Get student info
    const studentResult = await query(
      'SELECT level, stream FROM students WHERE adm_no = $1 AND year = $2 LIMIT 1',
      [admNo, parseInt(year)]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const student = studentResult.rows[0];

    const yearsForStudent = await query(
      'SELECT DISTINCT year FROM students WHERE adm_no = $1 ORDER BY year DESC',
      [admNo]
    );
    
    // Calculate student_index: position in sorted list of students (1-based)
    const allStudentsResult = await query(
      'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [student.level, student.stream, parseInt(year)]
    );
    
    const sortedAdmNos = allStudentsResult.rows.map(s => s.adm_no).sort();
    const studentIndex = (sortedAdmNos.indexOf(admNo) + 1).toString();
    
    // Get distinct months from monthly_results for this student (using student_index)
    const monthsFromResults = await query(
      `SELECT DISTINCT mr.month, mr.year
       FROM monthly_results mr
       WHERE mr.student_index = $1 AND mr.level = $2 AND mr.stream = $3 AND mr.year = $4`,
      [studentIndex, student.level, student.stream, parseInt(year)]
    );
    
    // Also get months from individual_scores (in case monthly_results doesn't have all months)
    const monthsFromScores = await query(
      `SELECT DISTINCT month, year
       FROM individual_scores
       WHERE adm_no = $1 AND year = $2`,
      [admNo, parseInt(year)]
    );
    
    // Combine and deduplicate months
    const allMonths = new Map();
    [...monthsFromResults.rows, ...monthsFromScores.rows].forEach(row => {
      const key = `${row.month}-${row.year}`;
      if (!allMonths.has(key)) {
        allMonths.set(key, row);
      }
    });
    
    const monthsArray = Array.from(allMonths.values()).sort((a, b) => {
      const monthOrder = {
        // Swahili month names
        'Jrb1': 1, 'Robo': 2, 'Jrb2': 3, 'Nusu': 4, 'Muh': 5,
        // English month names - chronological order
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5,
        'June': 6, 'July': 7, 'August': 8, 'September': 9, 'October': 10,
        'November': 11, 'December': 12
      };
      const orderA = monthOrder[a.month] || 999;
      const orderB = monthOrder[b.month] || 999;
      // If same month order, sort by year ascending
      if (orderA === orderB) {
        return (a.year || 0) - (b.year || 0);
      }
      return orderA - orderB;
    });
    
    // Get distinct terms where comments exist for this student
    const termsResult = await query(
      `SELECT DISTINCT term,
         CASE term
           WHEN 'Term I' THEN 1
           WHEN 'Term II' THEN 2
           WHEN 'Term III' THEN 3
           ELSE 4
         END as term_order
       FROM comments
       WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4
       ORDER BY term_order`,
      [studentIndex, student.level, student.stream, parseInt(year)]
    );
    
    // Get distinct terms where tabia_mwenendo exists
    const tabiaMwenendoTermsResult = await query(
      `SELECT DISTINCT term,
         CASE term
           WHEN 'Term I' THEN 1
           WHEN 'Term II' THEN 2
           WHEN 'Term III' THEN 3
           ELSE 4
         END as term_order
       FROM tabia_mwenendo
       WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4
       ORDER BY term_order`,
      [studentIndex, student.level, student.stream, parseInt(year)]
    );
    
    // Combine all terms
    const allTerms = new Set();
    termsResult.rows.forEach(row => allTerms.add(row.term));
    tabiaMwenendoTermsResult.rows.forEach(row => allTerms.add(row.term));
    
    res.json({ 
      months: monthsArray,
      terms: Array.from(allTerms).sort((a, b) => {
        const order = { 'Term I': 1, 'Term II': 2, 'Term III': 3 };
        return (order[a] || 4) - (order[b] || 4);
      }),
      years: yearsForStudent.rows.map((r) => r.year)
    });
  } catch (error) {
    console.error('Get student months error:', error);
    return sendError(res, error, 500);
  }
});

// Get student photo
router.get('/student/:admNo/photo', async (req, res) => {
  try {
    const { admNo } = req.params;
    const { level, stream, year } = req.query;
    
    if (!level || !stream || !year) {
      return res.status(400).json({ message: 'level, stream, and year are required' });
    }
    
    // Get all students for the class, sorted by name: first_name, then middle_name, then surname (A-Z)
    // This matches how student_index is calculated in the admin panel
    const studentsResult = await query(
      `SELECT adm_no FROM students 
       WHERE level = $1 AND stream = $2 AND year = $3 
       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`,
      [level, stream, parseInt(year)]
    );
    
    // Find the student_index (0-based position in sorted list)
    const studentIndex = studentsResult.rows.findIndex(s => s.adm_no === admNo);
    
    if (studentIndex === -1) {
      return res.status(404).json({ message: 'Student not found in this class' });
    }
    
    // Get photo using student_index
    const photoResult = await query(
      `SELECT photo_filename FROM student_photos 
       WHERE level = $1 AND stream = $2 AND year = $3 AND student_index = $4`,
      [level, stream, parseInt(year), studentIndex]
    );
    
    if (photoResult.rows.length === 0) {
      return res.json({ photo: null });
    }
    
    if (!photoResult.rows[0].photo_filename) {
      return res.json({ photo: null });
    }
    
    res.json({ photo: { photo_filename: photoResult.rows[0].photo_filename } });
  } catch (error) {
    console.error('Get student photo error:', error);
    return sendError(res, error, 500);
  }
});

function normalizeTermForReport(termRaw) {
  const t = decodeURIComponent(String(termRaw || '').trim());
  if (/^term\s*i$/i.test(t) || /^term\s*1$/i.test(t)) return 'Term I';
  if (/^term\s*ii$/i.test(t) || /^term\s*2$/i.test(t)) return 'Term II';
  return null;
}

function getReportMonthsForTerm(termNormalized, form) {
  const isFormVOrVI = form && (form === 'FORM V' || form === 'FORM VI');
  // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
  // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
  if (isFormVOrVI) {
    return (termNormalized === 'Term I' || termNormalized === 'Term 1')
      ? ['August', 'September', 'October', 'November']
      : ['February', 'March', 'April', 'May'];
  } else {
    return (termNormalized === 'Term I' || termNormalized === 'Term 1')
      ? ['February', 'March', 'April', 'May']
      : ['August', 'September', 'October', 'November'];
  }
}

// Weighted term scores as used on the official student report (same logic as /reports/individual)
router.get('/student/:admNo/report-scores', async (req, res) => {
  try {
    const { admNo } = req.params;
    const { year, term } = req.query;

    if (!year) {
      return res.status(400).json({ message: 'year is required' });
    }
    if (!term) {
      return res.status(400).json({ message: 'term is required (e.g. Term I or Term II)' });
    }

    const termNormalized = normalizeTermForReport(term);
    if (!termNormalized) {
      return res.status(400).json({ message: 'term must be Term I or Term II' });
    }

    const yearNum = parseInt(year, 10);
    const studentResult = await query(
      'SELECT * FROM students WHERE adm_no = $1 AND year = $2 LIMIT 1',
      [admNo, yearNum]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found for this year' });
    }

    const student = studentResult.rows[0];
    const form = student.level;
    const normalizedStream = normalizeStream(student.stream);
    const actualStream = student.stream;
    const months = getReportMonthsForTerm(termNormalized, form);

    let marksConfig = {
      month_weights: {
        February: 40.0,
        March: 0.0,
        April: 40.0,
        May: 20.0,
        August: 40.0,
        September: 0.0,
        October: 40.0,
        November: 20.0
      }
    };

    try {
      const marksConfigResult = await query('SELECT * FROM marks_config WHERE id = 1');
      if (marksConfigResult.rows.length > 0) {
        const config = marksConfigResult.rows[0];
        marksConfig = {
          month_weights: {
            February: parseFloat(config.february_weight || 40.0),
            March: parseFloat(config.march_weight || 0.0),
            April: parseFloat(config.april_weight || 40.0),
            May: parseFloat(config.may_weight || 20.0),
            August: parseFloat(config.august_weight || 40.0),
            September: parseFloat(config.september_weight || 0.0),
            October: parseFloat(config.october_weight || 40.0),
            November: parseFloat(config.november_weight || 20.0)
          }
        };
      }
    } catch (e) {
      // Marks config table not found, use defaults
    }

    const subjectStreams =
      actualStream === 'NA' || normalizedStream === 'A' ? ['A', 'NA'] : [actualStream];
    const uniqueSubjectStreams = [...new Set(subjectStreams)];

    let subjectsResult;
    if (uniqueSubjectStreams.length === 1) {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        [form, uniqueSubjectStreams[0], yearNum]
      );
    } else {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
        [form, uniqueSubjectStreams[0], uniqueSubjectStreams[1], yearNum]
      );
    }

    const monthlyResult = await query(
      'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND month = ANY($6::text[])',
      [admNo, form, actualStream, normalizedStream, yearNum, months]
    );

    const allStudentsResult = await query(
      'SELECT adm_no FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4',
      [form, actualStream, normalizedStream, yearNum]
    );

    const allMonthlyResults = await query(
      'SELECT * FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = ANY($5::text[])',
      [form, actualStream, normalizedStream, yearNum, months]
    );

    const subjectRankings = {};
    subjectsResult.rows.forEach((subject) => {
      const subjectTotals = {};
      const subjectCodesToMatch = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);

      allStudentsResult.rows.forEach((s) => {
        let total = 0;
        let validMonths = 0;
        months.forEach((month) => {
          const result = allMonthlyResults.rows.find(
            (r) => r.adm_no === s.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
          );
          if (result) {
            // Skip NULL/not registered scores
            if (result.score === null || result.score === undefined || result.score === '' || result.score === '-') {
              return;
            }
            const weight = marksConfig.month_weights[month] || 0;
            total += parseFloat(result.score) * (weight / 100);
            validMonths++;
          }
        });
        // Use average per valid month for fair ranking
        subjectTotals[s.adm_no] = validMonths > 0 ? total / validMonths : 0;
      });

      const sorted = Object.entries(subjectTotals)
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));

      subjectRankings[subject.subject_code] = {};
      sorted.forEach((item) => {
        subjectRankings[subject.subject_code][item.adm_no] = item.rank;
      });
    });

    const overallTotals = {};
    allStudentsResult.rows.forEach((s) => {
      let grandTotal = 0;
      let validSubjects = 0;
      subjectsResult.rows.forEach((subject) => {
        const subjectCodesToMatch = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
        let subjectTotal = 0;
        let validMonths = 0;
        months.forEach((month) => {
          const result = allMonthlyResults.rows.find(
            (r) => r.adm_no === s.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
          );
          if (result) {
            // Skip NULL/not registered scores
            if (result.score === null || result.score === undefined || result.score === '' || result.score === '-') {
              return;
            }
            const weight = marksConfig.month_weights[month] || 0;
            subjectTotal += parseFloat(result.score) * (weight / 100);
            validMonths++;
          }
        });
        // Only count subjects with valid scores
        if (validMonths > 0) {
          grandTotal += subjectTotal / validMonths;
          validSubjects++;
        }
      });
      // Use average per subject for fair ranking
      overallTotals[s.adm_no] = validSubjects > 0 ? grandTotal / validSubjects : 0;
    });

    const sortedOverall = Object.entries(overallTotals)
      .sort((a, b) => b[1] - a[1])
      .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));

    const overallRank = sortedOverall.find((item) => item.adm_no === admNo)?.rank ?? null;
    const totalStudents = allStudentsResult.rows.length;

    const subjectsOut = [];
    let totalMarks = 0;

    subjectsResult.rows.forEach((subject) => {
      const subjectCodesToMatch = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
      const monthScores = {};
      const monthContributions = {};

      months.forEach((month) => {
        const result = monthlyResult.rows.find(
          (r) => subjectCodesToMatch.includes(r.subject_code) && r.month === month
        );
        // Skip NULL/not registered scores
        if (result && (result.score === null || result.score === undefined || result.score === '' || result.score === '-')) {
          monthScores[month] = null;
          monthContributions[month] = 0;
        } else {
          const raw = result ? parseFloat(result.score) : null;
          monthScores[month] = raw;
          const w = (marksConfig.month_weights[month] || 0) / 100;
          monthContributions[month] = raw !== null ? raw * w : 0;
        }
      });

      const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
      const grade = calculateGrade(weightedTotal, form);
      const rank = subjectRankings[subject.subject_code]?.[admNo] ?? null;

      subjectsOut.push({
        subject_code: subject.subject_code,
        subject_name: subject.subject_name || subject.subject_code,
        month_scores: monthScores,
        month_weights: months.reduce((acc, m) => {
          acc[m] = marksConfig.month_weights[m] ?? 0;
          return acc;
        }, {}),
        month_contributions: monthContributions,
        weighted_total: Math.round(weightedTotal * 100) / 100,
        grade,
        rank
      });

      totalMarks += weightedTotal;
    });

    const subjectsData = {};
    subjectsOut.forEach((s) => {
      subjectsData[s.subject_code] = { weighted_total: s.weighted_total };
    });
    const average = calculateOverallAverage(subjectsData);
    const overallGrade = calculateGrade(average, form);

    res.json({
      term: termNormalized,
      year: yearNum,
      months,
      marks_config: marksConfig,
      subjects: subjectsOut,
      summary: {
        average: Math.round(average * 100) / 100,
        overall_grade: overallGrade,
        position: overallRank,
        total_students: totalStudents,
        subject_count: subjectsOut.length
      }
    });
  } catch (error) {
    console.error('Get student report-scores error:', error);
    return sendError(res, error, 500);
  }
});

// Get student monthly results with all comments
router.get('/student/:admNo/results/:month', async (req, res) => {
  try {
    const { admNo, month } = req.params;
    const { year, term } = req.query;
    
    if (!year) {
      return res.status(400).json({ message: 'year is required' });
    }
    
    // Get student info (including student_index)
    const studentResult = await query(
      'SELECT * FROM students WHERE adm_no = $1 AND year = $2 LIMIT 1',
      [admNo, parseInt(year)]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    // Calculate student_index: position in sorted list of students (1-based)
    const allStudentsResult = await query(
      'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [student.level, student.stream, parseInt(year)]
    );
    
    const sortedAdmNos = allStudentsResult.rows.map(s => s.adm_no).sort();
    const studentIndex = (sortedAdmNos.indexOf(admNo) + 1).toString();
    
    // Determine term from month if not provided
    // Map months to terms: Jrb1, Robo -> Term I; Jrb2, Nusu -> Term II; Muh -> Term II
    let determinedTerm = term;
    if (!determinedTerm) {
      if (['Jrb1', 'Robo', 'February', 'March', 'April'].includes(month)) {
        determinedTerm = 'Term I';
      } else if (['Jrb2', 'Nusu', 'Muh', 'May', 'August', 'September'].includes(month)) {
        determinedTerm = 'Term II';
      } else {
        determinedTerm = 'Term I'; // Default
      }
    }
    
    // Get subject-level results from individual_scores (this is what students need to see)
    const resultsResult = await query(
      `SELECT 
        adm_no,
        subject_code,
        month,
        year,
        level,
        stream,
        score as total
       FROM individual_scores
       WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4 AND month = $5
       ORDER BY subject_code`,
      [admNo, student.level, student.stream, student.year, month]
    );
    
    // Get all students' scores for each subject to calculate ranks
    const allScoresResult = await query(
      `SELECT 
        adm_no,
        subject_code,
        score
       FROM individual_scores
       WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4
       ORDER BY subject_code, score DESC`,
      [student.level, student.stream, student.year, month]
    );
    
    // Calculate grades and ranks for each subject
    const results = resultsResult.rows.map(result => {
      const score = parseFloat(result.total) || 0;
      const grade = calculateGrade(score, student.level);
      
      // Calculate rank for this subject
      const subjectScores = allScoresResult.rows
        .filter(s => s.subject_code === result.subject_code)
        .map(s => ({ adm_no: s.adm_no, score: parseFloat(s.score) || 0 }))
        .sort((a, b) => b.score - a.score);
      
      const rank = subjectScores.findIndex(s => s.adm_no === admNo) + 1;
      
      return {
        ...result,
        grade: grade,
        rank: rank > 0 ? rank : null
      };
    });
    
    // Also get summary from monthly_results if available (for total, average, grade, position)
    const summaryResult = await query(
      `SELECT total_marks, average, grade, position, remarks
       FROM monthly_results
       WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND month = $5
       LIMIT 1`,
      [studentIndex, student.level, student.stream, student.year, month]
    );
    
    // Get all comment types for this student and term
    const commentTypes = ['sala', 'tabia', 'michezo', 'taaluma', 'mwalimu_taaluma', 'mkuu_shule', 'huduma'];
    const commentsResult = await query(
      `SELECT comment_type, comment_text
       FROM comments
       WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5
       AND comment_type = ANY($6::text[])`,
      [studentIndex, student.level, student.stream, student.year, determinedTerm, commentTypes]
    );

    const comments = {};
    commentsResult.rows.forEach(comment => {
      comments[comment.comment_type] = comment.comment_text || '';
    });
    
    // Get TABIA NA MWENENDO (behavior evaluations) - this is stored separately
    // Each row has criterion (901-911) and evaluation (A, B, C, etc.)
    const tabiaMwenendoResult = await query(
      `SELECT criterion, evaluation
       FROM tabia_mwenendo
       WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5
       ORDER BY criterion`,
      [studentIndex, student.level, student.stream, student.year, determinedTerm]
    );
    
    // Format TABIA NA MWENENDO data as object: { "901": "A", "902": "B", ... }
    const tabiaMwenendo = {};
    tabiaMwenendoResult.rows.forEach(row => {
      tabiaMwenendo[row.criterion] = row.evaluation;
    });
    
    // Calculate summary - use monthly_results if available, otherwise calculate from individual_scores
    let totalScore, average, grade, position, remarks;
    
    if (summaryResult.rows.length > 0) {
      const summary = summaryResult.rows[0];
      totalScore = parseFloat(summary.total_marks) || 0;
      average = parseFloat(summary.average) || 0;
      grade = summary.grade;
      position = summary.position;
      remarks = summary.remarks;
    } else {
      // Calculate from individual_scores
      totalScore = results.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
      average = results.length > 0 ? totalScore / results.length : 0;
      // Calculate grade from average
      grade = average > 0 ? calculateGrade(average, student.level) : null;
      remarks = null;
      
      // Calculate position by comparing total scores with all students in the class
      const allStudentsTotalsResult = await query(
        `SELECT 
          adm_no,
          SUM(score) as total_score
         FROM individual_scores
         WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4
         GROUP BY adm_no
         ORDER BY total_score DESC`,
        [student.level, student.stream, student.year, month]
      );
      
      const sortedStudents = allStudentsTotalsResult.rows.map((s, index) => ({
        adm_no: s.adm_no,
        total_score: parseFloat(s.total_score) || 0,
        position: index + 1
      }));
      
      const studentPosition = sortedStudents.findIndex(s => s.adm_no === admNo);
      position = studentPosition >= 0 ? studentPosition + 1 : null;
    }
    
    // Get total number of students in the class for "out of"
    const totalStudentsResult = await query(
      `SELECT COUNT(DISTINCT adm_no) as total_students
       FROM individual_scores
       WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4`,
      [student.level, student.stream, student.year, month]
    );
    const totalStudents = parseInt(totalStudentsResult.rows[0]?.total_students) || 0;
    
    res.json({
      student,
      results,
      comments: {
        ...comments,
        tabia_mwenendo: tabiaMwenendo
      },
      summary: {
        totalScore,
        average,
        subjectCount: results.length,
        grade,
        position,
        totalStudents,
        remarks
      },
      month,
      term: determinedTerm,
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Get student results error:', error);
    return sendError(res, error, 500);
  }
});

module.exports = router;

