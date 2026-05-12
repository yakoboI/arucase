// Test August scores specifically
const { query } = require('./config/database');

async function testAugustScores() {
  try {
    console.log('=== TESTING AUGUST SCORES ===');
    
    // Check individual scores for August
    const scoresResult = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'August'
       LIMIT 10`
    );
    
    console.log('Sample August scores:');
    scoresResult.rows.forEach(row => {
      console.log(`  ${row.adm_no}: ${row.subject_code} = ${row.score}`);
    });
    
    // Check subjects for August
    const subjectsResult = await query(
      `SELECT DISTINCT subject_code, subject_abbreviation 
       FROM subjects 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025
       ORDER BY subject_code`
    );
    
    console.log('\nAvailable subjects:');
    subjectsResult.rows.forEach(subject => {
      console.log(`  ${subject.subject_code} (${subject.subject_abbreviation})`);
    });
    
    // Test the scores mapping logic
    const subjectCodeToAbbr = {};
    subjectsResult.rows.forEach(subject => {
      const key = subject.subject_abbreviation || subject.subject_code;
      subjectCodeToAbbr[subject.subject_code] = key;
      if (subject.subject_abbreviation) {
        subjectCodeToAbbr[subject.subject_abbreviation] = key;
      }
    });
    
    console.log('\nSubject mapping:', subjectCodeToAbbr);
    
    // Create scores map like the backend does
    const scoresMap = {};
    scoresResult.rows.forEach(row => {
      if (!scoresMap[row.adm_no]) {
        scoresMap[row.adm_no] = {};
      }
      const subjectKey = subjectCodeToAbbr[row.subject_code] || row.subject_code;
      scoresMap[row.adm_no][subjectKey] = row.score;
      scoresMap[row.adm_no][row.subject_code] = row.score;
    });
    
    console.log('\nSample scores map:');
    Object.keys(scoresMap).slice(0, 3).forEach(admNo => {
      console.log(`  ${admNo}:`, scoresMap[admNo]);
    });
    
  } catch (error) {
    console.error('Error testing August scores:', error);
  } finally {
    process.exit(0);
  }
}

testAugustScores();
