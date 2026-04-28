const { query } = require('../config/database');

async function checkTable() {
  try {
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_parishes'
      ORDER BY ordinal_position
    `);
    console.log('student_parishes columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkTable();
