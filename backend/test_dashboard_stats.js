const { query } = require('./config/database');

async function testDashboardStats() {
  try {
    console.log('Testing dashboard stats API...');
    
    // Test the main queries from dashboard stats endpoint
    console.log('\n=== Testing Student Counts ===');
    const studentCountsResult = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM I' THEN 1 ELSE 0 END) as form_i,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM II' THEN 1 ELSE 0 END) as form_ii,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM III' THEN 1 ELSE 0 END) as form_iii,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM IV' THEN 1 ELSE 0 END) as form_iv,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM V' THEN 1 ELSE 0 END) as form_v,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM VI' THEN 1 ELSE 0 END) as form_vi
      FROM students
    `);
    
    if (studentCountsResult.rows.length > 0) {
      const counts = studentCountsResult.rows[0];
      console.log('Total students:', counts.total);
      console.log('Form I:', counts.form_i);
      console.log('Form II:', counts.form_ii);
      console.log('Form III:', counts.form_iii);
      console.log('Form IV:', counts.form_iv);
      console.log('Form V:', counts.form_v);
      console.log('Form VI:', counts.form_vi);
    } else {
      console.log('No student counts found');
    }
    
    console.log('\n=== Testing Batch Counts ===');
    const batchCountsResult = await query(`
      SELECT 
        (SELECT COUNT(DISTINCT subject_code) FROM subjects) as subjects,
        (SELECT COUNT(*) FROM student_photos) as photos,
        (SELECT COUNT(*) FROM monthly_results) as monthly_results,
        (SELECT COUNT(*) FROM individual_scores) as scores,
        (SELECT COUNT(*) FROM comments) as comments,
        (SELECT COUNT(*) FROM tabia_mwenendo) as tabia_mwenendo,
        (SELECT COUNT(*) FROM individual_debt) as debts,
        (SELECT COUNT(*) FROM student_parishes) as parishes
    `);
    
    if (batchCountsResult.rows.length > 0 && batchCountsResult.rows[0]) {
      const counts = batchCountsResult.rows[0];
      console.log('Total subjects:', counts.subjects);
      console.log('Total photos:', counts.photos);
      console.log('Monthly results:', counts.monthly_results);
      console.log('Individual scores:', counts.scores);
      console.log('Comments:', counts.comments);
      console.log('Tabia mwenendo:', counts.tabia_mwenendo);
      console.log('Debts:', counts.debts);
      console.log('Parishes:', counts.parishes);
    } else {
      console.log('No batch counts found');
    }
    
    console.log('\n=== Testing Per-Form Academic Breakdown ===');
    const subjectsByFormResult = await query(`
      SELECT UPPER(TRIM(level)) AS level, COUNT(DISTINCT subject_code) AS count
      FROM subjects
      GROUP BY UPPER(TRIM(level))
    `);
    
    if (subjectsByFormResult.rows.length > 0) {
      subjectsByFormResult.rows.forEach(row => {
        console.log(`${row.level}: ${row.count} subjects`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testDashboardStats();
