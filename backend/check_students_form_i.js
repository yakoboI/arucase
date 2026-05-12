const { query } = require('./config/database');

async function checkStudents() {
  try {
    console.log('Checking students for FORM I Stream A 2025...');
    
    // Check exact query that marks config might be using
    console.log('\n=== Checking exact query ===');
    const exactQueryResult = await query(
      'SELECT * FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY first_name, middle_name, adm_no',
      ['FORM I', 'A', 2025]
    );
    
    console.log(`Exact query found ${exactQueryResult.rows.length} students`);
    
    if (exactQueryResult.rows.length > 0) {
      console.log('Sample students:');
      exactQueryResult.rows.slice(0, 5).forEach((student, index) => {
        console.log(`${index + 1}. ${student.adm_no}: ${student.first_name} ${student.middle_name || ''} ${student.surname} - Stream: ${student.stream}`);
      });
    }
    
    // Check with stream variations (A, NA)
    console.log('\n=== Checking with stream variations ===');
    const variationsResult = await query(
      'SELECT * FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY first_name, middle_name, adm_no',
      ['FORM I', 'A', 'NA', 2025]
    );
    
    console.log(`Stream variations query found ${variationsResult.rows.length} students`);
    
    // Check all FORM I students for 2025
    console.log('\n=== Checking all FORM I 2025 ===');
    const allFormIResult = await query(
      'SELECT * FROM students WHERE level = $1 AND year = $3 ORDER BY first_name, middle_name, adm_no',
      ['FORM I', 2025]
    );
    
    console.log(`All FORM I 2025: ${allFormIResult.rows.length} students`);
    
    // Check what streams exist for FORM I 2025
    console.log('\n=== Stream distribution for FORM I 2025 ===');
    const streamDistResult = await query(
      'SELECT stream, COUNT(*) as count FROM students WHERE level = $1 AND year = $3 GROUP BY stream ORDER BY stream',
      ['FORM I', 2025]
    );
    
    console.log('Stream distribution:');
    streamDistResult.rows.forEach(row => {
      console.log(`  ${row.stream}: ${row.count} students`);
    });
    
    // Check if there are any students with different case variations
    console.log('\n=== Checking case variations ===');
    const caseVariationsResult = await query(
      `SELECT DISTINCT stream FROM students WHERE level = $1 AND year = $3`,
      ['FORM I', 2025]
    );
    
    console.log('Available streams:');
    caseVariationsResult.rows.forEach(row => {
      console.log(`  "${row.stream}"`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkStudents();
