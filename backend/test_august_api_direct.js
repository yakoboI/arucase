// Test August API directly with authentication
const axios = require('axios');

async function testAugustAPI() {
  try {
    console.log('=== TESTING AUGUST API WITH AUTH ===');
    
    // First, test login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test August scores API with token
    const scoresResponse = await axios.get('http://localhost:5000/api/students/scores/batch', {
      params: {
        level: 'FORM I',
        stream: 'A',
        year: '2025',
        month: 'August'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Scores API Status:', scoresResponse.status);
    console.log('Students with scores:', Object.keys(scoresResponse.data.scores || {}).length);
    
    if (Object.keys(scoresResponse.data.scores || {}).length > 0) {
      const firstStudent = Object.keys(scoresResponse.data.scores)[0];
      console.log('Sample student scores:', scoresResponse.data.scores[firstStudent]);
    }
    
    // Test subjects API
    const subjectsResponse = await axios.get('http://localhost:5000/api/students/subjects/list', {
      params: {
        level: 'FORM I',
        stream: 'A',
        year: '2025'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Subjects API Status:', subjectsResponse.status);
    console.log('Available subjects:', subjectsResponse.data.map(s => `${s.subject_code} (${s.subject_abbreviation})`));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAugustAPI();
