/**
 * Enhanced Authentication with Refresh Tokens
 * Add this to your existing auth.js or create separate refresh token routes
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { protectByUsername, trackByUsername, clearFailedAttempts } = require('../middleware/bruteForceProtection');
const { saveUserActivity } = require('../utils/activityLogger');
const { sendError } = require('../utils/safeError');
const { validators } = require('../middleware/validation');

const router = express.Router();

// Refresh token secret (different from access token)
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_KEY;

// Store refresh tokens in database (more secure than memory)
const storeRefreshToken = async (userId, refreshToken, expiresAt) => {
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) 
     VALUES ($1, $2, $3, NOW()) 
     ON CONFLICT (user_id) 
     DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
    [userId, refreshToken, expiresAt]
  );
};

// Validate refresh token
const validateRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // Check if token exists in database
    const result = await query(
      'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    
    return result.rows.length > 0 ? decoded.user_id : null;
  } catch (error) {
    return null;
  }
};

// Enhanced token generation
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { user_id: user.username, role: user.role, permissions: user.permissions || {} },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { user_id: user.username, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Enhanced login with refresh tokens
router.post('/login-enhanced', protectByUsername, validators.login, trackByUsername, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // ... existing user validation code from auth.js ...
    
    // Get user from database
    const result = await query(
      'SELECT id, username, full_name, role, status, permissions, email, profile_picture, password_hash FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    
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
    
    // Generate both tokens
    const { accessToken, refreshToken } = generateTokens({ ...user, permissions });
    
    // Store refresh token in database
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await storeRefreshToken(user.username, refreshToken, refreshExpiresAt);
    
    // Prepare user data
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
    
    // Clear failed attempts
    clearFailedAttempts(username);
    
    // Set secure cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      user: userData,
      expiresIn: 15 * 60 // 15 minutes in seconds
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, error, 500);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }
    
    // Validate refresh token
    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    
    // Get user data
    const result = await query(
      'SELECT id, username, full_name, role, status, permissions, email, profile_picture FROM users WHERE username = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    
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
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({ ...user, permissions });
    
    // Update refresh token in database
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.username, newRefreshToken, refreshExpiresAt);
    
    // Set new cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      message: 'Token refreshed successfully',
      expiresIn: 15 * 60
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    return sendError(res, error, 500);
  }
});

// Enhanced logout with token cleanup
router.post('/logout-enhanced', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const username = decoded.user_id;
        
        // Remove refresh token from database
        await query('DELETE FROM refresh_tokens WHERE user_id = $1', [username]);
        
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
    
    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    return sendError(res, error, 500);
  }
});

module.exports = { 
  router, 
  generateTokens, 
  storeRefreshToken, 
  validateRefreshToken 
};
