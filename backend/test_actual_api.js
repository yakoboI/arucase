const express = require('express');
const cors = require('cors');
const studentsRouter = require('./routes/students');
const { query } = require('./config/database');

// Create a test app
const app = express();
app.use(cors());
app.use(express.json());

// Add the students routes
app.use('/api/students', studentsRouter);

// Test the actual API endpoint
async function testActualAPI() {
  try {
    console.log('=== TESTING ACTUAL API ENDPOINT ===');
    
    // Simulate the API call parameters
    const params = {
      level: 'FORM I',
      stream: 'A',  // This should be normalized to 'A' and include 'NA'
      year: '2025',
      month: 'November'
    };
    
    console.log('Testing with params:', params);
    
    // Make the actual database query that the API would make
    const level = 'FORM I';
    const normalizedStream = 'A';
    const year = 2025;
    const month = 'November';
    
    console.log('Normalized params:', { level, normalizedStream, year, month });
    
    // Get subjects
    const subjectsResult = await query(
      `SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4`,
      [level, normalizedStream, 'NA', year]
    );
    
    console.log('Subjects count:', subjectsResult.rows.length);
    console.log('Sample subjects:', subjectsResult.rows.slice(0, 5));
    
    // Get scores
    const scoresResult = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [level, normalizedStream, 'NA', year, month]
    );
    
    console.log('Scores count:', scoresResult.rows.length);
    console.log('Sample scores:', scoresResult.rows.slice(0, 5));
    
    // Create the scores map like the API does
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
    
    console.log('Final scores map structure:');
    console.log('- Number of students with scores:', Object.keys(scoresMap).length);
    console.log('- Sample student adm_no:', Object.keys(scoresMap)[0]);
    console.log('- Sample student scores:', scoresMap[Object.keys(scoresMap)[0]]);
    
    // Test what the frontend would see
    console.log('\n=== FRONTEND PERSPECTIVE ===');
    const sampleStudentAdmNo = Object.keys(scoresMap)[0];
    console.log('Frontend would access: subjectScores["' + sampleStudentAdmNo + '"]');
    console.log('Which equals:', scoresMap[sampleStudentAdmNo]);
    
    // Check if any students have missing scores
    console.log('\n=== CHECK FOR DATA ISSUES ===');
    const studentsWithFullScores = [];
    const studentsWithPartialScores = [];
    
    Object.keys(scoresMap).forEach(admNo => {
      const scoreCount = Object.keys(scoresMap[admNo]).length;
      if (scoreCount === subjectsResult.rows.length) {
        studentsWithFullScores.push(admNo);
      } else {
        studentsWithPartialScores.push({ adm_no: admNo, score_count: scoreCount });
      }
    });
    
    console.log('Students with full scores:', studentsWithFullScores.length);
    console.log('Students with partial scores:', studentsWithPartialScores.length);
    if (studentsWithPartialScores.length > 0) {
      console.log('Sample partial scores:', studentsWithPartialScores.slice(0, 3));
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  } finally {
    process.exit(0);
  }
}

testActualAPI();
