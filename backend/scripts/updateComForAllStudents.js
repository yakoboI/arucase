const { query } = require('../config/database');

(async () => {
  try {
    console.log('Updating com field for all students...\n');

    // Update Form I students to UI
    console.log('Updating Form I students to UI...');
    const formIResult = await query(
      `UPDATE students 
       SET com = 'UI' 
       WHERE level = 'FORM I' AND (com IS NULL OR com != 'UI')
       RETURNING adm_no, level, com`
    );
    console.log(`  Updated ${formIResult.rows.length} Form I students to UI`);

    // Update Form II-IV students with science subjects to SC
    console.log('\nUpdating Form II-IV students with science subjects to SC...');
    const scienceSubjects = ['CHE', 'PHY', 'BIO', 'CHEMISTRY', 'PHYSICS', 'BIOLOGY'];
    const scienceResult = await query(
      `UPDATE students s
       SET com = 'SC'
       WHERE s.level IN ('FORM II', 'FORM III', 'FORM IV')
       AND s.adm_no IN (
         SELECT DISTINCT sc.adm_no
         FROM individual_scores sc
         WHERE sc.subject_code = ANY($1)
         AND sc.level = s.level
         AND sc.stream = s.stream
         AND sc.year = s.year
       )
       AND (s.com IS NULL OR s.com != 'SC')
       RETURNING s.adm_no, s.level, s.com`,
      [scienceSubjects]
    );
    console.log(`  Updated ${scienceResult.rows.length} Form II-IV students to SC`);

    // Update Form II-IV students without science subjects to SS
    console.log('\nUpdating Form II-IV students without science subjects to SS...');
    const nonScienceResult = await query(
      `UPDATE students s
       SET com = 'SS'
       WHERE s.level IN ('FORM II', 'FORM III', 'FORM IV')
       AND s.adm_no NOT IN (
         SELECT DISTINCT sc.adm_no
         FROM individual_scores sc
         WHERE sc.subject_code = ANY($1)
         AND sc.level = s.level
         AND sc.stream = s.stream
         AND sc.year = s.year
       )
       AND (s.com IS NULL OR s.com != 'SS')
       RETURNING s.adm_no, s.level, s.com`,
      [scienceSubjects]
    );
    console.log(`  Updated ${nonScienceResult.rows.length} Form II-IV students to SS`);

    // Form V-VI: use stream as combination
    console.log('\nUpdating Form V-VI students to use stream as com...');
    const formVVIResult = await query(
      `UPDATE students 
       SET com = stream 
       WHERE level IN ('FORM V', 'FORM VI') 
       AND (com IS NULL OR com != stream)
       RETURNING adm_no, level, stream, com`
    );
    console.log(`  Updated ${formVVIResult.rows.length} Form V-VI students to use stream as com`);

    console.log('\n✅ Update complete!');

    // Verify the updates
    console.log('\nVerification:');
    const verification = await query(
      `SELECT level, com, COUNT(*) as count
       FROM students
       GROUP BY level, com
       ORDER BY level, com`
    );
    console.log('Students by level and com:');
    verification.rows.forEach(row => {
      console.log(`  ${row.level}: ${row.com || 'NULL'} (${row.count} students)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
