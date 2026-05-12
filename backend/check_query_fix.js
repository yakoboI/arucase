const { query } = require('./config/database');

async function testQueryFix() {
  try {
    console.log('Testing query parameter fix...');
    
    // Test the problematic query with explicit casting
    const result = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY first_name, middle_name, adm_no',
      ['FORM I', 'A', 2025]
    );
    
    console.log(`Query successful: ${result.rows.length} students found`);
    
    if (result.rows.length > 0) {
      result.rows.slice(0, 3).forEach((student, index) => {
        console.log(`${index + 1}. ${student.adm_no}: ${student.first_name} ${student.surname} - Stream: ${student.stream}`);
      });
    }
    
  } catch (error) {
    console.error('Query error:', error.message);
    console.error('Code:', error.code);
  } finally {
    process.exit(0);
  }
}

testQueryFix();
