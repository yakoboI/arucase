// Test if the API endpoint is directly accessible
const axios = require('axios');

async function testDirectAPI() {
  try {
    console.log('Testing direct API access...');
    
    // Test the exact endpoint that frontend is calling
    const response = await axios.get('http://localhost:3001/api/students?level=FORM%20I&stream=A&year=2025', {
      headers: {
        'Content-Type': 'application/json',
        // Add a test token to see if that's the issue
        'Authorization': 'Bearer test-token'
      },
      timeout: 5000
    });
    
    console.log('✅ API Response status:', response.status);
    console.log('✅ API Response data:', response.data);
    console.log('✅ Students count:', response.data.students?.length || 0);
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Data:', error.response.data);
    }
  }
  process.exit(0);
}

testDirectAPI();
