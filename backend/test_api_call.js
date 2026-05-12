const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/reports/individual/FORM%20I/A/2025/Second%20Term/1824',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n=== API RESPONSE ANALYSIS ===');
      console.log(`subjects array length: ${response.subjects?.length || 0}`);
      console.log(`monthly_results array length: ${response.monthly_results?.length || 0}`);
      
      console.log('\nSubjects received:');
      response.subjects?.forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.subject_code} - ${s.subject_name}`);
      });
      
      console.log('\nMonthly results received:');
      response.monthly_results?.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.subject_code} - ${r.month} - ${r.score}`);
      });
      
      // Check for duplicates
      const subjectCodes = response.subjects?.map(s => s.subject_code) || [];
      const duplicateSubjects = subjectCodes.filter((code, index) => subjectCodes.indexOf(code) !== index);
      
      const monthlySubjectCodes = response.monthly_results?.map(r => r.subject_code) || [];
      const duplicateMonthly = monthlySubjectCodes.filter((code, index) => monthlySubjectCodes.indexOf(code) !== index);
      
      console.log(`\nDuplicate subjects: ${duplicateSubjects.length > 0 ? duplicateSubjects.join(', ') : 'None'}`);
      console.log(`Duplicate monthly results: ${duplicateMonthly.length > 0 ? duplicateMonthly.join(', ') : 'None'}`);
      
    } catch (e) {
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
