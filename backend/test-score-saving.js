/**
 * Test Score Saving Functionality
 * This script tests that scores are being saved properly after fixing the created_by constraint
 */

const { query } = require('./config/database');

async function testScoreSaving() {
  try {
    console.log('🔍 DEBUG: Testing score saving functionality...');
    
    // 1. Get a test student and subject
    console.log('🔍 DEBUG: Getting test student and subject...');
    const student = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students LIMIT 1');
    const subject = await query('SELECT id, subject_name, subject_code FROM preformone_interview_subjects LIMIT 1');
    
    if (student.rows.length === 0 || subject.rows.length === 0) {
      console.log('❌ ERROR: No students or subjects available for testing');
      return;
    }
    
    const testStudent = student.rows[0];
    const testSubject = subject.rows[0];
    console.log('🔍 DEBUG: Using student:', testStudent.admission_number, 'subject:', testSubject.subject_name);
    
    // 2. Test inserting a score without created_by (should work now)
    console.log('🔍 DEBUG: Testing score insert without created_by...');
    const insertResult = await query(`
      INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, grade, remarks)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, subject_id, subject_type) 
      DO UPDATE SET 
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [testStudent.id, testSubject.id, 'interview', 75, 'B', 'Test score without created_by']);
    
    console.log('🔍 DEBUG: Score inserted successfully:', insertResult.rows[0]);
    
    // 3. Test inserting a score with created_by (should also work)
    console.log('🔍 DEBUG: Testing score insert with created_by...');
    const insertResult2 = await query(`
      INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, grade, remarks, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (student_id, subject_id, subject_type) 
      DO UPDATE SET 
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        remarks = EXCLUDED.remarks,
        created_by = EXCLUDED.created_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [testStudent.id, testSubject.id, 'interview', 85, 'A', 'Test score with created_by', 1]);
    
    console.log('🔍 DEBUG: Score with created_by inserted successfully:', insertResult2.rows[0]);
    
    // 4. Verify the score was saved
    console.log('🔍 DEBUG: Verifying saved score...');
    const verifyResult = await query(`
      SELECT 
        sc.*,
        st.admission_number,
        st.first_name,
        st.surname,
        sub.subject_name,
        sub.subject_code
      FROM preform_one_scores sc
      JOIN preform_one_students st ON sc.student_id = st.id
      LEFT JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
      WHERE sc.student_id = $1 AND sc.subject_id = $2 AND sc.subject_type = $3
    `, [testStudent.id, testSubject.id, 'interview']);
    
    console.log('🔍 DEBUG: Verified score:', verifyResult.rows[0]);
    
    // 5. Test statistics calculation
    console.log('🔍 DEBUG: Testing statistics calculation...');
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(sc.score) as scored_students,
        ROUND(AVG(sc.score), 2) as average_score,
        MAX(sc.score) as highest_score,
        MIN(sc.score) as lowest_score,
        COUNT(CASE WHEN sc.score >= 60 THEN 1 END) as passed_students,
        COUNT(CASE WHEN sc.grade = 'A' THEN 1 END) as grade_a,
        COUNT(CASE WHEN sc.grade = 'B' THEN 1 END) as grade_b,
        COUNT(CASE WHEN sc.grade = 'C' THEN 1 END) as grade_c,
        COUNT(CASE WHEN sc.grade = 'D' THEN 1 END) as grade_d,
        COUNT(CASE WHEN sc.grade = 'F' THEN 1 END) as grade_f
      FROM preform_one_students st
      LEFT JOIN preform_one_scores sc ON st.id = sc.student_id AND sc.subject_id = $1 AND sc.subject_type = $2
      WHERE st.year = 2025
    `, [testSubject.id, 'interview']);
    
    const stats = statsResult.rows[0];
    stats.pass_rate = stats.scored_students > 0 ? 
      Math.round((stats.passed_students / stats.scored_students) * 100) : 0;
    
    console.log('🔍 DEBUG: Statistics:', stats);
    
    console.log('✅ SUCCESS: Score saving test completed successfully!');
    console.log('📊 Test Results:');
    console.log(`  - Student: ${testStudent.admission_number} (${testStudent.first_name} ${testStudent.surname})`);
    console.log(`  - Subject: ${testSubject.subject_name} (${testSubject.subject_code})`);
    console.log(`  - Score saved: ${verifyResult.rows[0].score}`);
    console.log(`  - Grade: ${verifyResult.rows[0].grade}`);
    console.log(`  - Average score: ${stats.average_score}`);
    console.log(`  - Pass rate: ${stats.pass_rate}%`);
    
  } catch (error) {
    console.error('❌ ERROR: Score saving test failed:', error);
    console.error('❌ ERROR DETAILS:', error.message);
    console.error('❌ ERROR STACK:', error.stack);
  }
}

// Run the test
testScoreSaving()
  .then(() => {
    console.log('🔍 DEBUG: Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR: Test failed:', error);
    process.exit(1);
  });
