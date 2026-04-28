const { query } = require('../config/database');

(async () => {
  try {
    console.log('Testing com field logic...\n');

    // Test 1: Form I student should get UI
    console.log('Test 1: Form I student');
    const formIStudent = await query(
      "SELECT adm_no, level, stream, year, com FROM students WHERE level = 'FORM I' LIMIT 1"
    );
    if (formIStudent.rows.length > 0) {
      const student = formIStudent.rows[0];
      console.log(`  Student: ${student.adm_no}, Level: ${student.level}, Current com: ${student.com || 'NULL'}`);
      console.log(`  Expected: UI`);
    } else {
      console.log('  No Form I students found');
    }

    // Test 2: Form II-IV student with science subjects should get SC
    console.log('\nTest 2: Form II-IV student with science subjects');
    const scienceSubjects = ['CHE', 'PHY', 'BIO', 'CHEMISTRY', 'PHYSICS', 'BIOLOGY'];
    const scienceStudentResult = await query(
      `SELECT DISTINCT s.adm_no, s.level, s.stream, s.year, s.com
       FROM students s
       JOIN individual_scores sc ON s.adm_no = sc.adm_no AND s.level = sc.level AND s.stream = sc.stream AND s.year = sc.year
       WHERE s.level IN ('FORM II', 'FORM III', 'FORM IV')
       AND sc.subject_code = ANY($1)
       LIMIT 1`,
      [scienceSubjects]
    );
    if (scienceStudentResult.rows.length > 0) {
      const student = scienceStudentResult.rows[0];
      console.log(`  Student: ${student.adm_no}, Level: ${student.level}, Current com: ${student.com || 'NULL'}`);
      console.log(`  Expected: SC`);
    } else {
      console.log('  No Form II-IV students with science subjects found');
    }

    // Test 3: Form II-IV student without science subjects should get SS
    console.log('\nTest 3: Form II-IV student without science subjects');
    const nonScienceStudentResult = await query(
      `SELECT s.adm_no, s.level, s.stream, s.year, s.com
       FROM students s
       WHERE s.level IN ('FORM II', 'FORM III', 'FORM IV')
       AND s.adm_no NOT IN (
         SELECT DISTINCT sc.adm_no
         FROM individual_scores sc
         WHERE sc.subject_code = ANY($1)
       )
       LIMIT 1`,
      [scienceSubjects]
    );
    if (nonScienceStudentResult.rows.length > 0) {
      const student = nonScienceStudentResult.rows[0];
      console.log(`  Student: ${student.adm_no}, Level: ${student.level}, Current com: ${student.com || 'NULL'}`);
      console.log(`  Expected: SS`);
    } else {
      console.log('  No Form II-IV students without science subjects found');
    }

    // Test 4: Check if com column exists in students table
    console.log('\nTest 4: Check if com column exists');
    const columnCheck = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'com'
    `);
    if (columnCheck.rows.length > 0) {
      console.log(`  com column exists: ${columnCheck.rows[0].data_type}`);
    } else {
      console.log('  com column does NOT exist - need to add it');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
