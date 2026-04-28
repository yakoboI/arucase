const { query } = require('../config/database');

async function checkPhotoTerms() {
  try {
    const result = await query(`
      SELECT sp.*, s.term as student_term
      FROM student_photos sp
      LEFT JOIN students s ON sp.level = s.level AND sp.stream = s.stream AND sp.year = s.year
      ORDER BY sp.id
    `);
    console.log('Photos and their student terms:');
    result.rows.forEach(row => {
      console.log(`  Photo ID ${row.id}: ${row.level} ${row.stream} ${row.year} - Photo term: ${row.term}, Student term: ${row.student_term}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkPhotoTerms();
