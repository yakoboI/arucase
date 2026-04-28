const { query } = require('../config/database');

(async () => {
  try {
    // Check all comment types in database
    const commentTypesResult = await query('SELECT DISTINCT comment_type FROM comments');
    console.log('Comment types in DB:', commentTypesResult.rows.map(r => r.comment_type));

    // Check for mwalimu_taaluma and mkuu_shule comments
    const mwalimuResult = await query("SELECT * FROM comments WHERE comment_type = 'mwalimu_taaluma' LIMIT 5");
    console.log('\nMwalimu Taaluma comments (sample):', mwalimuResult.rows.length, 'found');
    if (mwalimuResult.rows.length > 0) {
      console.log('Sample:', mwalimuResult.rows[0]);
    }

    const mkuuResult = await query("SELECT * FROM comments WHERE comment_type = 'mkuu_shule' LIMIT 5");
    console.log('\nMkuu Shule comments (sample):', mkuuResult.rows.length, 'found');
    if (mkuuResult.rows.length > 0) {
      console.log('Sample:', mkuuResult.rows[0]);
    }

    // Check for the specific students mentioned (127, 121, 180)
    const specificStudents = await query(`
      SELECT c.*, s.adm_no, s.first_name, s.surname 
      FROM comments c 
      JOIN students s ON c.student_index = (
        SELECT idx FROM (
          SELECT ROW_NUMBER() OVER (ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC) - 1 as idx, adm_no
          FROM students 
          WHERE level = c.level AND stream = c.stream AND year = c.year
        ) sub 
        WHERE sub.adm_no = s.adm_no
      )
      WHERE s.adm_no IN (127, 121, 180)
      AND c.comment_type IN ('mwalimu_taaluma', 'mkuu_shule')
    `);
    console.log('\nComments for students 127, 121, 180 with mwalimu_taaluma/mkuu_shule:', specificStudents.rows.length, 'found');
    specificStudents.rows.forEach(row => {
      console.log(`  - Adm: ${row.adm_no}, Type: ${row.comment_type}, Comment: ${row.comment_text}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
