/**
 * Node.js/Express Server for Arusha Catholic Seminary
 * Main entry point
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cloudinary = require('./config/cloudinary');

// Validate Cloudinary credentials on startup
async function validateCloudinaryCredentials() {
  const missing = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

  if (missing.length > 0) {
    console.error('❌ CLOUDINARY ERROR: Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('⚠️  Photo uploads will fail. Set these variables in Railway or your .env file.');
    return false;
  }

  // Test Cloudinary connection
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connected successfully');
    return true;
  } catch (error) {
    console.error('❌ CLOUDINARY ERROR: Failed to connect to Cloudinary:', error.message);
    console.error('⚠️  Photo uploads will fail. Check your Cloudinary credentials.');
    return false;
  }
}

// Placeholder SVG for missing uploads (avoids 404s; shows a simple person icon)
const PLACEHOLDER_IMAGE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/></svg>',
  'utf8'
);

const app = express();

// Trust Railway's proxy so Express correctly reads the X-Forwarded-For header.
// Without this, express-rate-limit throws a ValidationError in production because
// the header is present but 'trust proxy' is false (the default).
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || (process.env.NODE_ENV === 'production' ? [] : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174'
    ]),
    methods: ['GET', 'POST']
  }
});

// Lightweight schema guards for development convenience.
// Ensures new columns exist without requiring a manual initDatabase run.
const { query } = require('./config/database');

async function ensureStudentsComColumn() {
  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'students'
            AND column_name = 'com'
        ) THEN
          ALTER TABLE students ADD COLUMN com VARCHAR(50);
        END IF;
      END $$;
    `);
  } catch (error) {
    // Don't crash the server; schema might already exist or user might not have privileges.
    console.warn('[schema] ensure students.com failed:', error.message);
  }
}

async function ensureStudentPhotosCloudinaryPublicIdColumn() {
  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'student_photos'
            AND column_name = 'cloudinary_public_id'
        ) THEN
          ALTER TABLE student_photos ADD COLUMN cloudinary_public_id VARCHAR(255);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[schema] ensure student_photos.cloudinary_public_id failed:', error.message);
  }
}

async function ensureStaffProfilesCloudinaryPublicIdColumn() {
  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'staff_profiles'
            AND column_name = 'cloudinary_public_id'
        ) THEN
          ALTER TABLE staff_profiles ADD COLUMN cloudinary_public_id VARCHAR(255);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[schema] ensure staff_profiles.cloudinary_public_id failed:', error.message);
  }
}


async function ensureAdministratorsCloudinaryPublicIdColumn() {
  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'administrators'
            AND column_name = 'cloudinary_public_id'
        ) THEN
          ALTER TABLE administrators ADD COLUMN cloudinary_public_id VARCHAR(255);
        END IF;
      END $$;
    `);
  } catch (error) {
    console.warn('[schema] ensure administrators.cloudinary_public_id failed:', error.message);
  }
}


// Run once at startup.
setImmediate(() => {
  ensureStudentsComColumn().catch((e) => console.warn('[schema] ensureStudentsComColumn fatal:', e.message));
  ensureStudentPhotosCloudinaryPublicIdColumn().catch((e) => console.warn('[schema] ensureStudentPhotosCloudinaryPublicIdColumn fatal:', e.message));
  ensureStaffProfilesCloudinaryPublicIdColumn().catch((e) => console.warn('[schema] ensureStaffProfilesCloudinaryPublicIdColumn fatal:', e.message));
  ensureAdministratorsCloudinaryPublicIdColumn().catch((e) => console.warn('[schema] ensureAdministratorsCloudinaryPublicIdColumn fatal:', e.message));
  validateCloudinaryCredentials().catch((e) => console.warn('[cloudinary] Validation failed:', e.message));
  
  // Migration: Update all DIV scores to A/DIV
  query("UPDATE individual_scores SET subject_code = 'A/DIV' WHERE subject_code = 'DIV'")
    .then(result => {
      if (result.rowCount > 0) {
        console.log(`[migration] Updated ${result.rowCount} rows from DIV to A/DIV`);
      }
    })
    .catch(err => console.warn('[migration] DIV to A/DIV migration failed:', err.message));
});

// Enhanced Security Middleware
const { securityHeaders, customSecurityHeaders, securityMonitor } = require('./middleware/securityHeaders');
const { globalApiRateLimit } = require('./middleware/enhancedRateLimiting');

// Apply security middleware to all requests
app.use(securityHeaders);
app.use(customSecurityHeaders);
app.use(securityMonitor);
app.use(globalApiRateLimit);

// Original middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cookieParser());
const cloudinaryDomains = [
  'https://res.cloudinary.com',
  'https://api.cloudinary.com'
];
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  ...cloudinaryDomains
];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? [...process.env.ALLOWED_ORIGINS.split(','), ...cloudinaryDomains]
  : (process.env.NODE_ENV === 'production' ? cloudinaryDomains : defaultDevOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' })); // Reduced from 16MB to prevent memory exhaustion
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting - production-appropriate limits to prevent DDoS attacks
const rateLimitMax = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : null;
const defaultMax = process.env.NODE_ENV === 'production'
  ? (rateLimitMax || 500)   // Production: 500 requests per 15 minutes per IP (reasonable limit)
  : 5000;                    // Development: 5000 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: defaultMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/static/'),
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Serve uploads: if file exists send it, otherwise send placeholder (avoids 404s for missing admin/gallery photos)
// ETag + Last-Modified for 304 on reload = faster repeat loads (no re-download)
app.use('/static/uploads', (req, res, next) => {
  if (req.method !== 'GET') return next();
  const relativePath = req.path.replace(/^\//, '');
  const filePath = path.join(__dirname, 'static', 'uploads', relativePath);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
      const mtime = stat.mtime.getTime();
      const etag = `"${stat.size}-${mtime}"`;

      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= mtime) {
        res.status(304).end();
        return;
      }

      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day - fast repeat loads on mobile
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stat.mtime.toUTCString());
      return res.sendFile(filePath);
    }
  }
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.send(PLACEHOLDER_IMAGE);
});

// Serve other static files from static directory (cache for fast loading on slow/mobile)
const staticMaxAge = process.env.NODE_ENV === 'production' ? 604800 : 3600; // 7d or 1h
app.use('/static', express.static(path.join(__dirname, 'static'), {
  maxAge: staticMaxAge * 1000,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

// Health check
app.get('/health', async (req, res) => {
  try {
    const { query, pool } = require('./config/database');
    await query('SELECT 1');

    // Check Cloudinary status
    let cloudinaryStatus = 'unknown';
    try {
      await cloudinary.api.ping();
      cloudinaryStatus = 'connected';
    } catch (error) {
      cloudinaryStatus = 'disconnected';
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      cloudinary: cloudinaryStatus,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      cloudinary: 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    const { query } = require('./config/database');
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    
    // Get table count
    const tablesResult = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Get record counts for key tables
    // Table names are whitelisted — never interpolate user input here.
    const allowedTables = ['students', 'users', 'subjects', 'individual_scores'];
    const tableCounts = {};

    for (const table of allowedTables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM "${table}"`);
        tableCounts[table] = countResult.rows.length > 0 && countResult.rows[0] ? parseInt(countResult.rows[0].count) : 0;
      } catch (err) {
        tableCounts[table] = 'error';
      }
    }

    const { pool } = require('./config/database');
    res.json({
      status: 'connected',
      database: {
        current_time: result.rows.length > 0 ? result.rows[0].current_time : null,
        version: result.rows.length > 0 ? result.rows[0].pg_version.split(',')[0] : 'unknown',
        table_count: tablesResult.rows.length > 0 ? parseInt(tablesResult.rows[0].count) : 0,
        record_counts: tableCounts,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Request logging middleware (should be before routes)
const requestLogger = require('./middleware/requestLogger');
app.use('/api/', requestLogger);

// Admin Routes
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const { router: authRefreshRoutes } = require('./routes/auth-refresh');
const publicRoutes = require('./routes/public');
const reportsRoutes = require('./routes/reports');
const dtaMonitorRoutes = require('./routes/dtaMonitor');
const studentsRoutes = require('./routes/students');
const preFormOneRoutes = require('./routes/preFormOne');
const preFormOneInterviewSubjectsRoutes = require('./routes/preFormOneInterviewSubjects');
const preFormOneContinuingSubjectsRoutes = require('./routes/preFormOneContinuingSubjects');
const preFormOneScoresRoutes = require('./routes/preFormOneScores');
const preFormOnePromotionRoutes = require('./routes/preFormOnePromotion');
const systemGradesRoutes = require('./routes/systemGrades');

app.use('/api/auth', authRoutes);
app.use('/api/auth', authRefreshRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dta-monitor', dtaMonitorRoutes);
app.use('/api/pre-form-one', preFormOneRoutes);
app.use('/api/preformone-interview-subjects', preFormOneInterviewSubjectsRoutes);
app.use('/api/preformone-continuing-subjects', preFormOneContinuingSubjectsRoutes);
app.use('/api/preformone-scores', preFormOneScoresRoutes);
app.use('/api/preformone-promotion', preFormOnePromotionRoutes);
app.use('/api/system', systemGradesRoutes);
app.use('/api/cloudinary', require('./routes/cloudinary-signature'));

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('./middleware/auth');

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  // Remove 'Bearer ' prefix if present
  const actualToken = token.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(actualToken, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    return next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User:', socket.user?.username);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware (DatabaseOverloadError -> 503; in production hide 5xx details)
app.use((err, req, res, next) => {
  if (err.name === 'DatabaseOverloadError') {
    return res.status(503).json({ message: err.message || 'Service temporarily at capacity; try again shortly.' });
  }
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = (isProd && status >= 500) ? 'Internal server error' : (err.message || 'Internal server error');
  console.error('Error:', err);
  res.status(status).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Server continuing despite uncaught exception');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, log and continue
  if (process.env.NODE_ENV === 'production') {
    console.error('Server continuing despite unhandled rejection');
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY === 'dev-secret-key')) {
    console.warn('⚠️  SECURITY: Set JWT_SECRET_KEY in production to a long random value. Default secret is not safe.');
  }
});

module.exports = { app, io };

