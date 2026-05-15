/**
 * Authentication Routes
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth, requireRole, requirePermission, JWT_SECRET } = require('../middleware/auth');
const { validators } = require('../middleware/validation');
const { protectByUsername, trackByUsername, clearFailedAttempts } = require('../middleware/bruteForceProtection');
const { saveUserActivity } = require('../utils/activityLogger');
const { sendError } = require('../utils/safeError');
const { cookieShape } = require('../utils/hostingEnv');

// Generate JWT token
const generateToken = (user) => {
  // Validate required fields before signing
  if (!user || typeof user !== 'object') {
    throw new Error('generateToken: user must be an object');
  }
  if (!user.username || typeof user.username !== 'string') {
    throw new Error('generateToken: user.username is required and must be a string');
  }
  if (!user.role || typeof user.role !== 'string') {
    throw new Error('generateToken: user.role is required and must be a string');
  }

  // Handle token expiration - support both number (seconds) and string (e.g., '5m', '1h')
  let expiresIn = '5m'; // Default: 5 minutes
  
  if (process.env.JWT_ACCESS_TOKEN_EXPIRES) {
    const expiresValue = process.env.JWT_ACCESS_TOKEN_EXPIRES.trim();
    // If it's a number (e.g., "3600"), convert to seconds format
    if (!isNaN(expiresValue)) {
      const seconds = parseInt(expiresValue);
      // Convert to minutes if >= 60 seconds, otherwise keep as seconds
      if (seconds >= 60) {
        expiresIn = `${Math.floor(seconds / 60)}m`; // Convert to minutes
      } else {
        expiresIn = `${seconds}s`; // Keep as seconds
      }
    } else {
      // It's already a string format (e.g., '5m', '1h')
      expiresIn = expiresValue;
    }
  }
  
  return jwt.sign(
    {
      user_id: user.username,
      role: user.role,
      permissions: user.permissions || {}
    },
    JWT_SECRET,
    { expiresIn }
  );
};

// Enhanced Login with progressive rate limiting
const { enhancedAuthRateLimit, trackAuthFailures, clearAuthSuccess } = require('../middleware/enhancedRateLimiting');

router.post('/login', 
  enhancedAuthRateLimit,
  protectByUsername, 
  validators.login, 
  trackAuthFailures,
  trackByUsername,
  clearAuthSuccess,
  async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Get user from database (select only needed columns)
    const result = await query(
      'SELECT id, username, full_name, role, status, permissions, email, profile_picture, password_hash FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      // Log failed attempt
      try {
        await saveUserActivity({
          username: 'unknown',
          activity_type: 'login_failed',
          description: `Failed login attempt for username: ${username}`,
          details: { attempted_username: username }
        });
      } catch (err) {
        console.error('Error logging activity:', err);
      }
      
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const user = result.rows[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Log failed attempt
      try {
        await saveUserActivity({
          username: username,
          activity_type: 'login_failed',
          description: 'Failed login attempt - wrong password',
          details: { attempted_username: username }
        });
      } catch (err) {
        console.error('Error logging activity:', err);
      }
      
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    
    // Parse permissions JSON
    let permissions = {};
    if (user.permissions) {
      try {
        permissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions;
      } catch (err) {
        permissions = {};
      }
    }
    
    // Generate token
    const token = generateToken({ ...user, permissions });
    
    // Prepare user data (exclude sensitive info)
    const userData = {
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      permissions: permissions,
      email: user.email,
      profile_picture: user.profile_picture
    };
    
    // Log successful login
    try {
      if (username !== 'SUPERADMIN') {
        await saveUserActivity({
          username: username,
          activity_type: 'login_success',
          description: `Successful login as ${user.role}`,
          details: { role: user.role }
        });
      }
    } catch (err) {
      console.error('Error logging activity:', err);
    }
    
    // Clear failed attempts on successful login
    clearFailedAttempts(req.body.username);
    
    // Set HttpOnly cookie for JWT token (for server-side auth)
    res.cookie('token', token, cookieShape(24 * 60 * 60 * 1000));
    
    // Also return token in response body for client-side storage
    res.json({
      user: userData,
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, error, 500);
  }
});

// Get current user
router.get('/me', 
  require('../middleware/auth').requireAuth,
  async (req, res) => {
  try {
    // User is already verified by requireAuth middleware
    const username = req.user.user_id;
    
    // Get user from database (select only needed columns)
    const result = await query(
      'SELECT id, username, full_name, role, status, permissions, email, phone, profile_picture, bio, department, position FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Parse permissions
    let permissions = {};
    if (user.permissions) {
      try {
        permissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions;
      } catch (err) {
        permissions = {};
      }
    }
    
    // Prepare user data
    const userData = {
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      permissions: permissions,
      email: user.email,
      profile_picture: user.profile_picture
    };
    
    res.json({ user: userData });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return sendError(res, error, 500);
  }
});

const staffPresence = require('../utils/staffPresence');

// Live count of logged-in staff (sidebar); heartbeat every ~60s from clients
router.get('/presence/online-count', requireAuth, (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.username;
    if (userId) staffPresence.recordHeartbeat(userId);
    res.json({ count: staffPresence.getOnlineCount() });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

router.post('/presence/heartbeat', requireAuth, (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.username;
    const count = staffPresence.recordHeartbeat(userId);
    res.json({ count });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    // Try to get token from cookie first, then from header for backward compatibility
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Log successful logout
        try {
          if (decoded.user_id !== 'SUPERADMIN') {
            await saveUserActivity({
              username: decoded.user_id,
              activity_type: 'logout',
              description: 'User logged out',
              details: {}
            });
          }
        } catch (err) {
          console.error('Error logging activity:', err);
        }
      } catch (err) {
        // Token invalid or expired, ignore
      }
    }
    
    // Clear HttpOnly cookie
    res.clearCookie('token', cookieShape());
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

module.exports = router;

