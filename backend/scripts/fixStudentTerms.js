const { query } = require('../config/database');

async function fixTerms() {
  try {
    console.log('Updating Term I to First Term...');
    const result1 = await query(`
      UPDATE students
      SET term = 'First Term'
      WHERE term = 'Term I'
    `);
    console.log(`Updated ${result1.rowCount} students from Term I to First Term`);

    console.log('Updating Term II to Second Term...');
    const result2 = await query(`
      UPDATE students
      SET term = 'Second Term'
      WHERE term = 'Term II'
    `);
    console.log(`Updated ${result2.rowCount} students from Term II to Second Term`);

    console.log('Updating individual_scores Term I to First Term...');
    const result3 = await query(`
      UPDATE individual_scores
      SET term = 'First Term'
      WHERE term = 'Term I'
    `);
    console.log(`Updated ${result3.rowCount} scores from Term I to First Term`);

    console.log('Updating individual_scores Term II to Second Term...');
    const result4 = await query(`
      UPDATE individual_scores
      SET term = 'Second Term'
      WHERE term = 'Term II'
    `);
    console.log(`Updated ${result4.rowCount} scores from Term II to Second Term`);

    // Show results
    const studentResult = await query(`
      SELECT term, COUNT(*) as student_count
      FROM students
      GROUP BY term
    `);
    console.log('\nStudent term distribution:');
    studentResult.rows.forEach(row => {
      console.log(`  ${row.term}: ${row.student_count}`);
    });

    const scoreResult = await query(`
      SELECT term, COUNT(*) as score_count
      FROM individual_scores
      GROUP BY term
    `);
    console.log('\nScore term distribution:');
    scoreResult.rows.forEach(row => {
      console.log(`  ${row.term}: ${row.score_count}`);
    });

    console.log('\n✅ Term values fixed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

fixTerms();
