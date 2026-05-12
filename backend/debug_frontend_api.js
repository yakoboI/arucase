// Simulate the frontend API call to debug the issue
const axios = require('axios');

async function debugFrontendAPICall() {
  try {
    console.log('=== DEBUGGING FRONTEND API CALL ===');
    
    // Simulate the exact parameters the frontend would send
    const params = {
      level: 'FORM I',
      stream: 'A',  // This comes from URL: /stream/A/
      year: '2025',
      month: 'November'
    };
    
    console.log('Frontend API call params:', params);
    
    // Simulate the API endpoint URL
    const apiUrl = `http://localhost:5000/api/students/scores/batch?${new URLSearchParams(params).toString()}`;
    console.log('API URL:', apiUrl);
    
    // Try to make the actual API call (if backend is running)
    try {
      const response = await axios.get(apiUrl);
      console.log('API Response Status:', response.status);
      console.log('API Response Data Structure:', Object.keys(response.data));
      console.log('Scores keys:', Object.keys(response.data.scores || {}));
      console.log('Number of students with scores:', Object.keys(response.data.scores || {}).length);
      
      if (Object.keys(response.data.scores || {}).length > 0) {
        const firstStudentAdmNo = Object.keys(response.data.scores)[0];
        console.log('First student ADM_NO:', firstStudentAdmNo);
        console.log('First student scores:', response.data.scores[firstStudentAdmNo]);
      }
    } catch (apiError) {
      console.log('API call failed (backend might not be running):', apiError.message);
    }
    
    // Now let's test what the backend logic would produce with these params
    console.log('\n=== BACKEND LOGIC SIMULATION ===');
    const { query } = require('./config/database');
    
    const level = 'FORM I';
    const stream = 'A';  // Frontend sends 'A'
    const year = 2025;
    const month = 'November';
    
    console.log('Backend receives:', { level, stream, year, month });
    
    // Backend normalizes stream
    const { normalizeStream } = require('./utils/streamNormalizer');
    const normalizedStream = normalizeStream(stream);
    console.log('Backend normalized stream:', normalizedStream);
    
    // Get subjects
    const subjectsResult = await query(
      `SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4`,
      [level, normalizedStream, 'NA', year]
    );
    
    console.log('Subjects found:', subjectsResult.rows.length);
    
    // Get scores
    const scoresResult = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [level, normalizedStream, 'NA', year, month]
    );
    
    console.log('Scores found:', scoresResult.rows.length);
    
    // Create scores map
    const subjectCodeToAbbr = {};
    subjectsResult.rows.forEach(subject => {
      const key = subject.subject_abbreviation || subject.subject_code;
      subjectCodeToAbbr[subject.subject_code] = key;
      if (subject.subject_abbreviation) {
        subjectCodeToAbbr[subject.subject_abbreviation] = key;
      }
    });
    
    const scoresMap = {};
    scoresResult.rows.forEach(row => {
      if (!scoresMap[row.adm_no]) {
        scoresMap[row.adm_no] = {};
      }
      const subjectKey = subjectCodeToAbbr[row.subject_code] || row.subject_code;
      scoresMap[row.adm_no][subjectKey] = row.score;
      scoresMap[row.adm_no][row.subject_code] = row.score;
    });
    
    console.log('Backend would return:', Object.keys(scoresMap).length, 'students with scores');
    
    // Check if there's a mismatch between what students are in the database vs what scores we have
    const studentsResult = await query(
      `SELECT adm_no, first_name, surname 
       FROM students 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4
       ORDER BY adm_no
       LIMIT 10`,
      [level, normalizedStream, 'NA', year]
    );
    
    console.log('First 10 students in database:');
    studentsResult.rows.forEach(student => {
      const hasScores = scoresMap[student.adm_no];
      const scoreCount = hasScores ? Object.keys(hasScores).length : 0;
      console.log(`  ${student.adm_no}: ${student.first_name} ${student.surname} - ${scoreCount} scores`);
    });
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugFrontendAPICall();
