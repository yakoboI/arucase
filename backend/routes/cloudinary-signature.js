const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { sendError } = require('../utils/safeError');

// Configure Cloudinary with backend credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Generate Cloudinary signature for frontend uploads
router.post('/signature', async (req, res) => {
  try {
    const { folder, public_id, timestamp } = req.body;
    
    // Validate required parameters
    if (!folder || !timestamp) {
      return res.status(400).json({
        error: 'Missing required parameters: folder, timestamp'
      });
    }
    
    // Generate signature
    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
      folder: folder,
      public_id: public_id
    }, process.env.CLOUDINARY_API_SECRET);
    
    res.json({
      signature: signature,
      timestamp: timestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY, // Only for frontend widget use
      folder: folder
    });
    
  } catch (error) {
    console.error('Cloudinary signature error:', error);
    return sendError(res, error, 500);
  }
});

// Test Cloudinary connection
router.get('/test', async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json({
      status: 'connected',
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      result: result
    });
  } catch (error) {
    console.error('Cloudinary test error:', error);
    res.status(500).json({
      status: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;
