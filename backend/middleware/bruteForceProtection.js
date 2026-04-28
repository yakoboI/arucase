/**
 * Brute Force Protection Middleware
 * Tracks failed login attempts and temporarily blocks IPs/users
 */
const NodeCache = require('node-cache');

// Cache to store failed attempts (TTL: 15 minutes)
const failedAttempts = new NodeCache({ stdTTL: 900 });

// Configuration
const MAX_ATTEMPTS = 5; // Maximum failed attempts before lockout
const LOCKOUT_TIME = 900; // Lockout duration in seconds (15 minutes)

// Get a unique key for tracking attempts
const getAttemptKey = (identifier) => {
  return `auth_attempt_${identifier}`;
};

// Track failed login attempt
const trackFailedAttempt = (identifier) => {
  const key = getAttemptKey(identifier);
  const current = failedAttempts.get(key) || 0;
  failedAttempts.set(key, current + 1);
  return current + 1;
};

// Get remaining attempts
const getRemainingAttempts = (identifier) => {
  const key = getAttemptKey(identifier);
  const current = failedAttempts.get(key) || 0;
  return Math.max(0, MAX_ATTEMPTS - current);
};

// Clear failed attempts on successful login
const clearFailedAttempts = (identifier) => {
  const key = getAttemptKey(identifier);
  failedAttempts.del(key);
};

// Check if IP/User is locked out
const isLockedOut = (identifier) => {
  const key = getAttemptKey(identifier);
  const attempts = failedAttempts.get(key) || 0;
  return attempts >= MAX_ATTEMPTS;
};

// Middleware to check brute force protection
const checkBruteForce = (identifierExtractor) => {
  return (req, res, next) => {
    const identifier = identifierExtractor(req);
    
    if (!identifier) {
      return next(); // No identifier to track, skip protection
    }
    
    if (isLockedOut(identifier)) {
      return res.status(429).json({
        message: 'Too many failed attempts. Please try again later.',
        retryAfter: LOCKOUT_TIME
      });
    }
    
    next();
  };
};

// Middleware to track failed attempts (call after authentication fails)
const trackFailure = (identifierExtractor) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // If response indicates authentication failure (401)
      if (res.statusCode === 401) {
        const identifier = identifierExtractor(req);
        if (identifier && identifier !== 'unknown') {
          const attempts = trackFailedAttempt(identifier);
          const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
          
          // Add remaining attempts to response
          if (typeof data === 'object') {
            data.remainingAttempts = remaining;
            if (remaining === 0) {
              data.lockoutTime = LOCKOUT_TIME;
            }
          }
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Clear attempts on successful login
const clearAttempts = (identifierExtractor) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // If response indicates successful authentication (200)
      if (res.statusCode === 200) {
        const identifier = identifierExtractor(req);
        if (identifier) {
          clearFailedAttempts(identifier);
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Extract identifier from IP address
const extractIp = (req) => {
  return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
};

// Extract identifier from username
const extractUsername = (req) => {
  return req.body?.username || req.params?.username || 'unknown';
};

// Pre-configured middleware
const protectByIp = checkBruteForce(extractIp);
const protectByUsername = checkBruteForce(extractUsername);
const trackByIp = trackFailure(extractIp);
const trackByUsername = trackFailure(extractUsername);
const clearByIp = clearAttempts(extractIp);
const clearByUsername = clearAttempts(extractUsername);

module.exports = {
  checkBruteForce,
  trackFailure,
  clearAttempts,
  protectByIp,
  protectByUsername,
  trackByIp,
  trackByUsername,
  clearByIp,
  clearByUsername,
  extractIp,
  extractUsername,
  isLockedOut,
  getRemainingAttempts,
  clearFailedAttempts,
  MAX_ATTEMPTS,
  LOCKOUT_TIME
};
