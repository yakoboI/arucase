const axios = require('axios');

async function testDashboardAPI() {
  try {
    console.log('Testing dashboard API endpoint...');
    
    // Test the exact same call the frontend makes
    const response = await axios.get('http://localhost:5000/api/admin/dashboard/stats', {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ API call successful');
      console.log('Stats keys:', Object.keys(response.data.stats || {}));
    } else {
      console.log('❌ API call failed');
    }
    
  } catch (error) {
    console.error('❌ Dashboard API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testDashboardAPI();
