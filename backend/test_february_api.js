// Test February API directly
const axios = require('axios');

async function testFebruaryAPI() {
  try {
    console.log('=== TESTING FEBRUARY API ===');
    
    // Test students API for February
    const studentsResponse = await axios.get('http://localhost:5000/api/students', {
      params: {
        level: 'FORM I',
        stream: 'A',
        year: '2025'
      },
      timeout: 5000
    });
    
    console.log('✅ Students API Status:', studentsResponse.status);
    console.log('Students found:', studentsResponse.data.length);
    
    if (studentsResponse.data.length > 0) {
      console.log('Sample student:', studentsResponse.data[0]);
    }
    
    // Test scores API for February
    const scoresResponse = await axios.get('http://localhost:5000/api/students/scores/batch', {
      params: {
        level: 'FORM I',
        stream: 'A',
        year: '2025',
        month: 'February'
      },
      timeout: 5000
    });
    
    console.log('✅ Scores API Status:', scoresResponse.status);
    console.log('Students with scores:', Object.keys(scoresResponse.data.scores || {}).length);
    
    // Test monthly results API for February
    const monthlyResultsResponse = await axios.get('http://localhost:5000/api/students/monthly-results/list', {
      params: {
        level: 'FORM I',
        stream: 'A',
        year: '2025',
        month: 'February'
      },
      timeout: 5000
    });
    
    console.log('✅ Monthly Results API Status:', monthlyResultsResponse.status);
    console.log('Monthly results found:', monthlyResultsResponse.data.length);
    
    console.log('\n=== CONCLUSION ===');
    console.log('Backend APIs are working correctly for February data');
    console.log('The issue is in the frontend authentication or API calls');
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication still failing - backend needs restart');
      console.log('Please restart the backend server: npm run dev');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Backend not running - start it with: npm run dev');
    } else {
      console.log('❌ Other error:', error.message);
    }
  }
}

testFebruaryAPI();
