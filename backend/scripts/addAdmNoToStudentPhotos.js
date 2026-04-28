const { query } = require('../config/database');

async function addAdmNoColumn() {
  try {
    console.log('Adding adm_no column to student_photos table...');
    await query(`
      ALTER TABLE student_photos
      ADD COLUMN IF NOT EXISTS adm_no VARCHAR(50)
    `);
    console.log('✅ adm_no column added successfully!');

    // Update existing photos to match their students' adm_no
    console.log('Updating existing photos with student adm_no...');
    const result = await query(`
      UPDATE student_photos sp
      SET adm_no = s.adm_no
      FROM students s
      WHERE sp.level = s.level
        AND sp.stream = s.stream
        AND sp.year = s.year
        AND sp.student_index = (
          SELECT ROW_NUMBER() OVER (ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC) - 1
          FROM students s2
          WHERE s2.level = s.level
            AND s2.stream = s.stream
            AND s2.year = s.year
            AND s2.adm_no = s.adm_no
        )
        AND sp.adm_no IS NULL
    `);
    console.log(`Updated ${result.rowCount} existing photo records with adm_no`);

    // Show the updated table structure
    const columnsResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'student_photos'
      ORDER BY ordinal_position
    `);
    console.log('\nstudent_photos table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

addAdmNoColumn();
