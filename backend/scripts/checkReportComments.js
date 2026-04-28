const { query } = require('../config/database');

(async () => {
  try {
    // Check comments for a specific student to see if they match what the report would fetch
    // Using student 127 from the user's data
    const studentResult = await query(
      "SELECT * FROM students WHERE adm_no = '127' AND level = 'FORM I' AND year = 2026"
    );
    
    if (studentResult.rows.length === 0) {
      console.log('Student 127 not found in FORM I 2026');
      process.exit(0);
    }
    
    const student = studentResult.rows[0];
    console.log('Found student:', student.adm_no, student.first_name, student.surname, 'Stream:', student.stream);
    
    // Calculate student_index the same way the report does
    const studentIndexStudentsResult = await query(
      `SELECT adm_no, first_name, middle_name, surname
       FROM students
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4
       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
       LIMIT 500`,
      ['FORM I', 'A', 'NA', 2026]
    );
    
    const studentIndexPos = studentIndexStudentsResult.rows.findIndex(
      (s) => String(s.adm_no) === String(student.adm_no)
    );
    const studentIndex = (studentIndexPos >= 0 ? studentIndexPos : -1).toString();
    
    console.log('Calculated student_index:', studentIndex);
    console.log('Total students in class:', studentIndexStudentsResult.rows.length);
    
    // Now fetch comments using this student_index
    const commentsResult = await query(
      `SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
      [studentIndex, 'FORM I', 'A', 'NA', 2026, 'Term I']
    );
    
    console.log('\nComments found for this student:', commentsResult.rows.length);
    commentsResult.rows.forEach(c => {
      console.log(`  - Type: ${c.comment_type}, Stream: ${c.stream}, Comment: ${c.comment_text}`);
    });
    
    // Specifically check for mwalimu_taaluma and mkuu_shule
    const mwalimu = commentsResult.rows.find(c => c.comment_type === 'mwalimu_taaluma');
    const mkuu = commentsResult.rows.find(c => c.comment_type === 'mkuu_shule');
    
    console.log('\nMwalimu Taaluma comment:', mwalimu ? mwalimu.comment_text : 'NOT FOUND');
    console.log('Mkuu Shule comment:', mkuu ? mkuu.comment_text : 'NOT FOUND');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
