const { query } = require('./config/database');

async function checkStudentMapping() {
  try {
    console.log('Checking all students for FORM I A/NA 2025...');
    const studentsResult = await query(
      `SELECT adm_no, first_name, middle_name, surname, stream 
       FROM students 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025
       ORDER BY adm_no
       LIMIT 10`
    );
    console.log('Found', studentsResult.rows.length, 'students');
    console.log('Students:', studentsResult.rows);
    
    console.log('\nChecking individual scores for these students...');
    for (const student of studentsResult.rows.slice(0, 5)) {
      const scoresResult = await query(
        `SELECT subject_code, score 
         FROM individual_scores 
         WHERE adm_no = '${student.adm_no}' AND level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'November'`
      );
      console.log(`Student ${student.adm_no} (${student.first_name} ${student.surname}):`, scoresResult.rows.length, 'scores');
      if (scoresResult.rows.length > 0) {
        console.log('  Scores:', scoresResult.rows);
      }
    }
    
    console.log('\nChecking batch API mapping logic...');
    // Simulate the backend batch scores logic
    const level = 'FORM I';
    const normalizedStream = 'A'; // This should map both 'A' and 'NA'
    const year = 2025;
    const month = 'November';
    
    const subjectsResult = await query(
      `SELECT subject_code, subject_abbreviation FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4`,
      [level, normalizedStream, 'NA', year]
    );
    
    const subjectCodeToAbbr = {};
    subjectsResult.rows.forEach(subject => {
      const key = subject.subject_abbreviation || subject.subject_code;
      subjectCodeToAbbr[subject.subject_code] = key;
      if (subject.subject_abbreviation) {
        subjectCodeToAbbr[subject.subject_abbreviation] = key;
      }
    });
    
    console.log('Subject mapping:', subjectCodeToAbbr);
    
    const scoresResult = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [level, normalizedStream, 'NA', year, month]
    );
    
    const scoresMap = {};
    scoresResult.rows.forEach(row => {
      if (!scoresMap[row.adm_no]) {
        scoresMap[row.adm_no] = {};
      }
      const subjectKey = subjectCodeToAbbr[row.subject_code] || row.subject_code;
      scoresMap[row.adm_no][subjectKey] = row.score;
      scoresMap[row.adm_no][row.subject_code] = row.score;
    });
    
    console.log('Sample scores map for first 3 students:');
    Object.keys(scoresMap).slice(0, 3).forEach(admNo => {
      console.log(`  ${admNo}:`, scoresMap[admNo]);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentMapping();
