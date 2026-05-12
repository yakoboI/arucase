const { query } = require('./config/database');

async function checkDatabaseDuplicates() {
  try {
    console.log('=== CHECKING DATABASE FOR DUPLICATES ===');
    
    // Check for duplicate subjects in subjects table
    const subjectDuplicates = await query(`
      SELECT subject_code, subject_name, stream, COUNT(*) as count 
      FROM subjects 
      WHERE level = $1 AND year = $2 
      GROUP BY subject_code, subject_name, stream 
      HAVING COUNT(*) > 1
    `, ['FORM I', 2025]);
    
    console.log(`\nDuplicate subjects in database: ${subjectDuplicates.rows.length}`);
    subjectDuplicates.rows.forEach(row => {
      console.log(`- ${row.subject_code} - ${row.subject_name} (${row.stream}): ${row.count} entries`);
    });
    
    // Check for duplicate scores in individual_scores table for student 1824
    const scoreDuplicates = await query(`
      SELECT subject_code, month, stream, COUNT(*) as count 
      FROM individual_scores 
      WHERE adm_no = $1 AND level = $2 AND year = $3 
      GROUP BY subject_code, month, stream 
      HAVING COUNT(*) > 1
    `, ['1824', 'FORM I', 2025]);
    
    console.log(`\nDuplicate scores for student 1824: ${scoreDuplicates.rows.length}`);
    scoreDuplicates.rows.forEach(row => {
      console.log(`- ${row.subject_code} - ${row.month} (${row.stream}): ${row.count} entries`);
    });
    
    // Check all scores for student 1824 to see the actual data
    const allScores = await query(`
      SELECT subject_code, month, score, stream 
      FROM individual_scores 
      WHERE adm_no = $1 AND level = $2 AND year = $3 
      ORDER BY subject_code, month
    `, ['1824', 'FORM I', 2025]);
    
    console.log(`\nAll scores for student 1824 (${allScores.rows.length} entries):`);
    allScores.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.subject_code} - ${row.month} - ${row.score} (${row.stream})`);
    });
    
    // Check if there are duplicate subject_code + month combinations across different streams
    const duplicateCombos = await query(`
      SELECT subject_code, month, COUNT(*) as count 
      FROM individual_scores 
      WHERE adm_no = $1 AND level = $2 AND year = $3 
      GROUP BY subject_code, month 
      HAVING COUNT(*) > 1
    `, ['1824', 'FORM I', 2025]);
    
    console.log(`\nDuplicate subject+month combinations (across all streams): ${duplicateCombos.rows.length}`);
    duplicateCombos.rows.forEach(row => {
      console.log(`- ${row.subject_code} - ${row.month}: ${row.count} entries`);
    });
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
  }
}

checkDatabaseDuplicates();
