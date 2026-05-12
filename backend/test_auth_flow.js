const axios = require('axios');

async function testAuthFlow() {
  try {
    console.log('Testing authentication flow...');
    
    // First, try to login to get a valid token
    console.log('\n=== Testing Login ===');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin', // You might need to change this
      password: 'admin'   // You might need to change this
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
