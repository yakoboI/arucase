const { query } = require('../config/database');

(async () => {
  try {
    // Find the students from the user's data (127, 121, 180)
    const studentsResult = await query(
      "SELECT * FROM students WHERE adm_no IN ('127', '121', '180')"
    );
    
    console.log('Found students:', studentsResult.rows.length);
    studentsResult.rows.forEach(s => {
      console.log(`  - Adm: ${s.adm_no}, Name: ${s.first_name} ${s.middle_name || ''} ${s.surname}, Level: ${s.level}, Stream: ${s.stream}, Year: ${s.year}, Term: ${s.term || 'N/A'}`);
    });
    
    // Check comments for these students
    for (const student of studentsResult.rows) {
      console.log(`\n--- Checking comments for student ${student.adm_no} (${student.first_name} ${student.surname}) ---`);
      
      // Calculate student_index
      const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(student.level);
      const studentIndexStudentsQuery = (isFormIToIV && student.stream === 'NA')
        ? `SELECT adm_no, first_name, middle_name, surname
           FROM students
           WHERE level = $1 AND stream IN ($2, $3) AND year = $4
           ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
           LIMIT 500`
        : `SELECT adm_no, first_name, middle_name, surname
           FROM students
           WHERE level = $1 AND stream = $2 AND year = $3
           ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
           LIMIT 500`;
      
      const params = (isFormIToIV && student.stream === 'NA')
        ? [student.level, 'A', 'NA', student.year]
        : [student.level, student.stream, student.year];
      
      const studentIndexStudentsResult = await query(studentIndexStudentsQuery, params);
      const studentIndexPos = studentIndexStudentsResult.rows.findIndex(
        (s) => String(s.adm_no) === String(student.adm_no)
      );
      const studentIndex = (studentIndexPos >= 0 ? studentIndexPos : -1).toString();
      
      console.log('Student index:', studentIndex);
      
      // Fetch comments
      const commentsResult = await query(
        `SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5`,
        [studentIndex, student.level, student.stream, student.year, student.term || 'Term I']
      );
      
      console.log('Comments found:', commentsResult.rows.length);
      commentsResult.rows.forEach(c => {
        console.log(`  - Type: ${c.comment_type}, Comment: ${c.comment_text}`);
      });
      
      // Check for mwalimu_taaluma and mkuu_shule
      const mwalimu = commentsResult.rows.find(c => c.comment_type === 'mwalimu_taaluma');
      const mkuu = commentsResult.rows.find(c => c.comment_type === 'mkuu_shule');
      
      console.log('Mwalimu Taaluma:', mwalimu ? mwalimu.comment_text : 'NOT FOUND');
      console.log('Mkuu Shule:', mkuu ? mkuu.comment_text : 'NOT FOUND');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
