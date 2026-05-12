const express = require('express');
const studentsRouter = require('./routes/students');

// Create a test app to simulate the API call
const app = express();
app.use(express.json());

// Mock the database query function
const mockQuery = async (sql, params) => {
  console.log('Mock Query SQL:', sql);
  console.log('Mock Query Params:', params);
  
  if (sql.includes('individual_scores')) {
    return {
      rows: [
        { adm_no: '1824', subject_code: 'BIO', score: '66.00' },
        { adm_no: '1824', subject_code: 'CHE', score: '60.00' },
        { adm_no: '1824', subject_code: 'PHY', score: '55.00' },
        { adm_no: '1826', subject_code: 'BIO', score: '82.00' },
        { adm_no: '1826', subject_code: 'CHE', score: '50.00' },
      ]
    };
  }
  
  if (sql.includes('subjects')) {
    return {
      rows: [
        { subject_code: 'BIO', subject_abbreviation: 'BIO' },
        { subject_code: 'CHE', subject_abbreviation: 'CHE' },
        { subject_code: 'PHY', subject_abbreviation: 'PHY' },
      ]
    };
  }
  
  return { rows: [] };
};

// Mock the normalizeStream function
const normalizeStream = (stream) => {
  if (stream === 'NA') return 'A';
  return stream;
};

// Simulate the batch scores API endpoint
async function simulateBatchScoresAPI() {
  try {
    const level = 'FORM I';
    const stream = 'A';
    const year = 2025;
    const month = 'November';
    
    console.log('=== SIMULATING BATCH SCORES API ===');
    console.log('Input params:', { level, stream, year, month });
    
    // Normalize level to uppercase and handle URL encoding
    const normalizedLevel = level;
    
    // Normalize stream: NA -> A, and ALL -> ALL
    const normalizedStream = normalizeStream(stream);
    console.log('Normalized stream:', normalizedStream);

    // Get all subjects for the class to map codes to abbreviations
    const subjectsResult = await mockQuery(
      `SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4`,
      [level, normalizedStream, 'NA', year]
    );
    
    console.log('Subjects found:', subjectsResult.rows);
    
    // Create mapping: subject_code -> subject_abbreviation (or code if no abbreviation)
    const subjectCodeToAbbr = {};
    subjectsResult.rows.forEach(subject => {
      const key = subject.subject_abbreviation || subject.subject_code;
      subjectCodeToAbbr[subject.subject_code] = key;
      // Also map abbreviation to itself if it exists
      if (subject.subject_abbreviation) {
        subjectCodeToAbbr[subject.subject_abbreviation] = key;
      }
    });
    
    console.log('Subject code to abbreviation mapping:', subjectCodeToAbbr);
    
    // Get all scores for the class and month
    const scoresResult = await mockQuery(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [level, normalizedStream, 'NA', year, month]
    );
    
    console.log('Scores found:', scoresResult.rows);
    
    // Convert to nested object: {adm_no: {subject_key: score}}
    // Use abbreviation as key (matching Flask template behavior)
    const scoresMap = {};
    scoresResult.rows.forEach(row => {
      if (!scoresMap[row.adm_no]) {
        scoresMap[row.adm_no] = {};
      }
      // Map subject_code to abbreviation (or use code if no abbreviation)
      const subjectKey = subjectCodeToAbbr[row.subject_code] || row.subject_code;
      // Store score under both code and abbreviation for flexibility
      scoresMap[row.adm_no][subjectKey] = row.score;
      scoresMap[row.adm_no][row.subject_code] = row.score; // Also keep original code for backward compatibility
    });
    
    console.log('Final scores map:', JSON.stringify(scoresMap, null, 2));
    
    return { scores: scoresMap };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

simulateBatchScoresAPI().then(result => {
  console.log('\n=== API RESULT ===');
  console.log('Result structure:', Object.keys(result));
  console.log('Scores keys:', Object.keys(result.scores));
  console.log('Sample student scores:', result.scores['1824']);
}).catch(console.error);
