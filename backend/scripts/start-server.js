#!/usr/bin/env node

/**
 * Railway Startup Script
 * Ensures proper server initialization with error handling
 */

console.log('🚀 Starting Railway server initialization...');
console.log('📊 Node.js version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('📊 Working directory:', process.cwd());

// Set default environment variables if missing
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

if (!process.env.PORT) {
  process.env.PORT = '5000';
}

console.log('🔧 Environment variables configured');
console.log('📊 PORT:', process.env.PORT);
console.log('📊 NODE_ENV:', process.env.NODE_ENV);

// Validate required files
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');
if (!fs.existsSync(serverPath)) {
  console.error('❌ ERROR: server.js not found at:', serverPath);
  process.exit(1);
}

console.log('✅ server.js found');

// Copy admin photos from the committed source directory into the
// Railway persistent volume (/app/admin-photos) so the Cloudinary
// upload script can find them.
try {
  console.log('🔄 Running admin photos volume setup...');
  const { setupAdminPhotosVolume } = require('./setup-admin-photos-volume');
  setupAdminPhotosVolume();
} catch (setupError) {
  // Non-fatal: log the error but do not prevent the server from starting.
  console.error('⚠️  Admin photos volume setup encountered an error:', setupError.message);
}

// Import and start the server
try {
  console.log('🔄 Loading server.js...');
  
  // Set up global error handling
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  // Start the server
  require('../server.js');
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}
