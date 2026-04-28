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

// Generate JWT token
const generateToken = (user) => {
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

// Login
router.post('/login', protectByUsername, validators.login, trackByUsername, async (req, res) => {
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
    
    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, error, 500);
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }
    
    const token = authHeader.split(' ')[1] || authHeader;
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decoded.user_id;
    
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

// Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1] || authHeader;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const username = decoded.user_id;
        
        // Log logout
        try {
          if (username && username !== 'SUPERADMIN') {
            await saveUserActivity({
              username: username,
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
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

module.exports = router;

