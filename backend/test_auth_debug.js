// Debug authentication issues
const jwt = require('jsonwebtoken');

// Test JWT secret and token generation
console.log('=== AUTHENTICATION DEBUG ===');

// Check environment variables
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET_KEY exists:', !!process.env.JWT_SECRET_KEY);
console.log('JWT_SECRET_KEY value:', process.env.JWT_SECRET_KEY ? '[SET]' : '[NOT SET]');

// Test JWT secret validation
const validateJwtSecret = () => {
  const secret = process.env.JWT_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('Is production:', isProduction);
  
  if (isProduction && (!secret || secret === 'dev-secret-key')) {
    throw new Error('CRITICAL: JWT_SECRET_KEY must be set in production');
  }
  
  return secret || 'dev-secret-key';
};

try {
  const JWT_SECRET = validateJwtSecret();
  console.log('JWT_SECRET being used:', JWT_SECRET === 'dev-secret-key' ? '[DEFAULT DEV SECRET]' : '[CUSTOM SECRET]');
  
  // Test token generation and verification
  const testPayload = {
    user_id: 'test_user',
    role: 'admin',
    permissions: {}
  };
  
  console.log('\n=== TESTING TOKEN GENERATION ===');
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
  console.log('Generated token:', token.substring(0, 50) + '...');
  
  console.log('\n=== TESTING TOKEN VERIFICATION ===');
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verification successful:', decoded);
  
  // Test expired token
  console.log('\n=== TESTING EXPIRED TOKEN ===');
  const expiredToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '-1h' });
  
  try {
    jwt.verify(expiredToken, JWT_SECRET);
    console.log('ERROR: Expired token should have failed!');
  } catch (error) {
    console.log('Expired token correctly rejected:', error.name);
  }
  
  // Test invalid token
  console.log('\n=== TESTING INVALID TOKEN ===');
  try {
    jwt.verify('invalid.token.here', JWT_SECRET);
    console.log('ERROR: Invalid token should have failed!');
  } catch (error) {
    console.log('Invalid token correctly rejected:', error.name);
  }
  
  console.log('\n=== CHECKING BACKEND STATUS ===');
  
  // Check if backend is running
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 5000,
    path: '/api/health',
    method: 'GET',
    timeout: 3000
  };
  
  const req = http.request(options, (res) => {
    console.log('Backend health check status:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Backend health response:', data);
      console.log('\n=== AUTHENTICATION SYSTEM STATUS ===');
      console.log('✅ JWT token generation/verification works');
      console.log('✅ Backend is accessible');
      console.log('❌ Issue likely with frontend token storage or backend token validation');
    });
  });
  
  req.on('error', (error) => {
    console.log('❌ Backend is not running or not accessible:', error.message);
    console.log('\n=== RECOMMENDATION ===');
    console.log('1. Start the backend server first');
    console.log('2. Check if PORT 5000 is available');
    console.log('3. Verify backend startup logs for errors');
  });
  
  req.on('timeout', () => {
    console.log('❌ Backend health check timed out');
    req.destroy();
  });
  
  req.end();
  
} catch (error) {
  console.error('❌ Authentication system error:', error.message);
}
