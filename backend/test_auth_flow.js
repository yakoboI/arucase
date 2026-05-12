const axios = require('axios');

async function testAuthFlow() {
  try {
    const username = process.env.TEST_LOGIN_USERNAME || 'admin';
    const password = process.env.TEST_LOGIN_PASSWORD;
    if (!password) {
      throw new Error('Set TEST_LOGIN_PASSWORD (and optionally TEST_LOGIN_USERNAME) for this dev script.');
    }
    console.log('Testing authentication flow...');
    
    // First, try to login to get a valid token
    console.log('\n=== Testing Login ===');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username,
      password,
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    if (loginResponse.data.message === 'Login successful') {
      console.log('✅ Login successful');
      console.log('Token:', loginResponse.data.token);
      
      // Now test dashboard API with the token
      console.log('\n=== Testing Dashboard with Token ===');
      const dashboardResponse = await axios.get('http://localhost:5000/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log('Dashboard response status:', dashboardResponse.status);
      console.log('Dashboard response data:', JSON.stringify(dashboardResponse.data, null, 2));
      
      if (dashboardResponse.data.success) {
        console.log('✅ Dashboard API working with authentication');
      } else {
        console.log('❌ Dashboard API still failing');
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('Auth flow test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testAuthFlow();
