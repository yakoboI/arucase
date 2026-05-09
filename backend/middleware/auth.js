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
    // Try to get token from cookie first, then from header for backward compatibility
    const cookieToken = req.cookies?.token;
    const headerToken = req.headers.authorization?.split(' ')[1];
    const token = cookieToken || headerToken;

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

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  JWT_SECRET
};

