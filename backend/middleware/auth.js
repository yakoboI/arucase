/**
 * Authentication Middleware
 */
const jwt = require('jsonwebtoken');

// Validate JWT secret key in production
const validateJwtSecret = () => {
  const secret = process.env.JWT_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && (!secret || secret === 'dev-secret-key')) {
    throw new Error('CRITICAL: JWT_SECRET_KEY must be set in production. Set a strong random secret key (32+ characters).');
  }
  
  return secret || 'dev-secret-key';
};

const JWT_SECRET = validateJwtSecret();

const requireAuth = (req, res, next) => {
  try {
    // Try to get token from multiple sources for compatibility:
    // 1. accessToken cookie (enhanced login)
    // 2. token cookie (legacy)
    // 3. Authorization header (fallback login)
    const accessTokenCookie = req.cookies?.accessToken;
    const legacyTokenCookie = req.cookies?.token;
    const headerToken = req.headers.authorization?.split(' ')[1];
    const token = accessTokenCookie || legacyTokenCookie || headerToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Authentication error' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Case-insensitive role comparison
    const userRole = (req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());
    
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const permissions = req.user.permissions || {};
    if (!permissions[permission]) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

const parsePermissionsObject = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
};

const isAdminLikeUser = (user) => {
  const role = (user?.role && String(user.role).toLowerCase()) || '';
  return role === 'admin' || role === 'superadmin';
};

/** Matches frontend hasModule: admin/superadmin, or modules includes `all` or moduleId */
const requireModule = (moduleId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (isAdminLikeUser(req.user)) {
      return next();
    }
    const perms = parsePermissionsObject(req.user.permissions);
    const modules = perms.modules;
    if (!Array.isArray(modules)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (modules.includes('all') || modules.includes(moduleId)) {
      return next();
    }
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  requireModule,
  JWT_SECRET
};

