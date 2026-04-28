const { query } = require('../config/database');

async function checkStudent() {
  try {
    const result = await query(`
      SELECT adm_no, first_name, surname, level, stream, year, term
      FROM students
      WHERE adm_no = '120'
    `);
    console.log('Student 120 data:');
    console.log(result.rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkStudent();
