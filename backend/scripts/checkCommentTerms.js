const { query } = require('../config/database');

(async () => {
  try {
    // Check what terms are stored in comments for these students
    const commentsResult = await query(
      `SELECT DISTINCT level, stream, year, term FROM comments WHERE level = 'FORM V' AND year = 2026`
    );
    
    console.log('Distinct term values in comments for FORM V 2026:');
    commentsResult.rows.forEach(r => {
      console.log(`  - Level: ${r.level}, Stream: ${r.stream}, Year: ${r.year}, Term: "${r.term}"`);
    });
    
    // Check the specific comments for the students
    const studentComments = await query(
      `SELECT c.*, s.adm_no, s.first_name, s.surname 
       FROM comments c
       JOIN students s ON c.student_index = (
         SELECT idx FROM (
           SELECT ROW_NUMBER() OVER (ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC) - 1 as idx, adm_no
           FROM students 
           WHERE level = c.level AND stream = c.stream AND year = c.year
         ) sub 
         WHERE sub.adm_no = s.adm_no
       )
       WHERE s.adm_no IN ('127', '121', '180')
       AND c.comment_type IN ('mwalimu_taaluma', 'mkuu_shule')
       AND c.level = 'FORM V' AND c.year = 2026`
    );
    
    console.log('\nComments for students 127, 121, 180:');
    studentComments.rows.forEach(c => {
      console.log(`  - Adm: ${c.adm_no}, Type: ${c.comment_type}, Stream: ${c.stream}, Term: "${c.term}", Comment: ${c.comment_text}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
