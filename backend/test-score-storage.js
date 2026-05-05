/**
 * Test Score Storage in Database
 * This script tests that scores are properly stored and retrieved from the database
 */

const { query } = require('./config/database');

async function testScoreStorage() {
  try {
    console.log('🔍 DEBUG: Testing score storage in database...');
    
    // 1. Check if preform_one_scores table exists
    console.log('🔍 DEBUG: Checking if preform_one_scores table exists...');
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'preform_one_scores'
      );
    `);
    
    console.log('🔍 DEBUG: Scores table exists:', tableCheck.rows[0].exists);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ ERROR: preform_one_scores table does not exist');
      return;
    }
    
    // 2. Check table structure
    console.log('🔍 DEBUG: Checking table structure...');
    const tableStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'preform_one_scores'
      ORDER BY ordinal_position;
    `);
    
    console.log('🔍 DEBUG: Table structure:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // 3. Check existing scores
    console.log('🔍 DEBUG: Checking existing scores...');
    const existingScores = await query('SELECT COUNT(*) as count FROM preform_one_scores');
    console.log('🔍 DEBUG: Existing scores count:', existingScores.rows[0].count);
    
    // 4. Get sample students and subjects for testing
    console.log('🔍 DEBUG: Getting sample students...');
    const students = await query('SELECT id, admission_number, first_name, surname FROM preform_one_students LIMIT 3');
    console.log('🔍 DEBUG: Sample students:', students.rows);
    
    console.log('🔍 DEBUG: Getting sample subjects...');
    const interviewSubjects = await query('SELECT id, subject_name, subject_code FROM preformone_interview_subjects LIMIT 2');
    const continuingSubjects = await query('SELECT id, subject_name, subject_code FROM preformone_continuing_subjects LIMIT 2');
    
    const allSubjects = [...interviewSubjects.rows, ...continuingSubjects.rows];
    console.log('🔍 DEBUG: Sample subjects:', allSubjects);
    
    if (students.rows.length === 0 || allSubjects.length === 0) {
      console.log('❌ ERROR: No students or subjects available for testing');
      return;
    }
    
    // 5. Insert test score
    console.log('🔍 DEBUG: Inserting test score...');
    const testStudent = students.rows[0];
    const testSubject = allSubjects[0];
    const testScore = 85;
    const testGrade = 'A';
    const testRemarks = 'Test score entry';
    
    const insertResult = await query(`
      INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, grade, remarks, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (student_id, subject_id, subject_type) 
      DO UPDATE SET 
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [testStudent.id, testSubject.id, 'interview', testScore, testGrade, testRemarks, 1]);
    
    console.log('🔍 DEBUG: Test score inserted:', insertResult.rows[0]);
    
    // 6. Retrieve the test score
    console.log('🔍 DEBUG: Retrieving test score...');
    const retrievedScore = await query(`
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
    
    console.log('🔍 DEBUG: Retrieved score:', retrievedScore.rows[0]);
    
    // 7. Test score retrieval by subject
    console.log('🔍 DEBUG: Testing score retrieval by subject...');
    const scoresBySubject = await query(`
      SELECT 
        sc.*,
        st.admission_number,
        st.first_name,
        st.surname
      FROM preform_one_scores sc
      JOIN preform_one_students st ON sc.student_id = st.id
      WHERE sc.subject_id = $1 AND sc.subject_type = $2
      ORDER BY st.admission_number
    `, [testSubject.id, 'interview']);
    
    console.log('🔍 DEBUG: Scores by subject:', scoresBySubject.rows);
    
    // 8. Test statistics calculation
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
    
    console.log('✅ SUCCESS: Score storage test completed successfully!');
    console.log('📊 Test Results:');
    console.log(`  - Table exists: ${tableCheck.rows[0].exists}`);
    console.log(`  - Test score inserted: ${insertResult.rows[0].score}`);
    console.log(`  - Test score retrieved: ${retrievedScore.rows[0]?.score}`);
    console.log(`  - Average score: ${stats.average_score}`);
    console.log(`  - Pass rate: ${stats.pass_rate}%`);
    
  } catch (error) {
    console.error('❌ ERROR: Score storage test failed:', error);
    console.error('❌ ERROR DETAILS:', error.message);
    console.error('❌ ERROR STACK:', error.stack);
  }
}

// Run the test
testScoreStorage()
  .then(() => {
    console.log('🔍 DEBUG: Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR: Test failed:', error);
    process.exit(1);
  });
