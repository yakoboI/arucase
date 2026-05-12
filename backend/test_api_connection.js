// Test if the frontend can now connect to the backend
const axios = require('axios');

async function testAPIConnection() {
  console.log('=== TESTING API CONNECTION ===');
  
  try {
    // Test the same endpoint that was failing
    const response = await axios.get('http://localhost:5000/api/students/scores/batch', {
      params: {
        level: 'FORM I',
        stream: 'A',
        year: '2025',
        month: 'November'
      },
      timeout: 5000
    });
    
    console.log('✅ API Connection successful!');
    console.log('Status:', response.status);
    console.log('Data keys:', Object.keys(response.data));
    console.log('Students with scores:', Object.keys(response.data.scores || {}).length);
    
    if (Object.keys(response.data.scores || {}).length > 0) {
      const firstStudent = Object.keys(response.data.scores)[0];
      console.log('Sample student scores:', response.data.scores[firstStudent]);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend is not running on port 5000');
      console.log('Please start the backend server with: npm run dev');
    } else if (error.response?.status === 401) {
      console.log('✅ Backend is accessible (401 means auth is working, just needs valid token)');
      console.log('The port fix worked - now it\'s just an authentication issue');
    } else {
      console.log('❌ Other error:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', error.response.data);
      }
    }
  }
}

testAPIConnection();
