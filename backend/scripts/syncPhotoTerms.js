const { query } = require('../config/database');

async function syncPhotoTerms() {
  try {
    console.log('Syncing photo terms with student terms...');

    // Update photos to match their corresponding students' terms
    const result = await query(`
      UPDATE student_photos sp
      SET term = s.term
      FROM students s
      WHERE sp.level = s.level
        AND sp.stream = s.stream
        AND sp.year = s.year
        AND sp.term IS DISTINCT FROM s.term
    `);

    console.log(`Updated ${result.rowCount} photo records to match student terms`);

    // Show the updated records
    const checkResult = await query(`
      SELECT sp.id, sp.level, sp.stream, sp.year, sp.term as photo_term, s.term as student_term
      FROM student_photos sp
      LEFT JOIN students s ON sp.level = s.level AND sp.stream = s.stream AND sp.year = s.year
      ORDER BY sp.id
    `);
    console.log('\nPhoto term sync results:');
    checkResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.level} ${row.stream} ${row.year} - Photo: ${row.photo_term}, Student: ${row.student_term}`);
    });

    console.log('\n✅ Photo terms synced successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

syncPhotoTerms();
