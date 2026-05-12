const { query } = require('./config/database');

async function checkData() {
  try {
    console.log('Checking individual_scores table for FORM I A 2025 November...');
    const result = await query(
      `SELECT adm_no, subject_code, score 
       FROM individual_scores 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'November'
       LIMIT 10`
    );
    console.log('Found', result.rows.length, 'records');
    console.log('Sample data:', result.rows.slice(0, 3));
    
    console.log('\nChecking monthly_results table...');
    const monthlyResult = await query(
      `SELECT student_index, total_marks, average, grade, position, remarks 
       FROM monthly_results 
       WHERE level = 'FORM I' AND stream = 'A' AND year = 2025 AND month = 'November'
       LIMIT 5`
    );
    console.log('Found', monthlyResult.rows.length, 'monthly results');
    console.log('Sample:', monthlyResult.rows.slice(0, 2));
    
    console.log('\nChecking subjects table...');
    const subjectsResult = await query(
      `SELECT subject_code, subject_abbreviation 
       FROM subjects 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025
       LIMIT 10`
    );
    console.log('Found', subjectsResult.rows.length, 'subjects');
    console.log('Sample:', subjectsResult.rows.slice(0, 5));
    
    console.log('\nChecking students table...');
    const studentsResult = await query(
      `SELECT adm_no, first_name, middle_name, surname, stream 
       FROM students 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025
       LIMIT 5`
    );
    console.log('Found', studentsResult.rows.length, 'students');
    console.log('Sample:', studentsResult.rows.slice(0, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
