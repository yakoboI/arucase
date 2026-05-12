const { query } = require('./config/database');

async function checkStudents() {
  try {
    console.log('Checking students for FORM I, A, 2025...');
    
    const result = await query('SELECT COUNT(*) as count FROM students WHERE level = $1 AND stream = $2 AND year = $3', ['FORM I', 'A', 2025]);
    console.log('Students count for FORM I, A, 2025:', result.rows[0].count);
    
    const result2 = await query('SELECT COUNT(*) as count FROM students WHERE level = $1 AND year = $2', ['FORM I', 2025]);
    console.log('All FORM I students 2025:', result2.rows[0].count);
    
    const result3 = await query('SELECT DISTINCT stream FROM students WHERE level = $1 AND year = $2', ['FORM I', 2025]);
    console.log('Available streams for FORM I 2025:', result3.rows.map(r => r.stream));
    
    // Check if there are any students at all
    const result4 = await query('SELECT COUNT(*) as count FROM students');
    console.log('Total students in database:', result4.rows[0].count);
    
    // Check sample students if any exist
    const result5 = await query('SELECT adm_no, first_name, surname, level, stream, year FROM students LIMIT 5');
    console.log('Sample students:', result5.rows);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkStudents();
