const { query } = require('../config/database');

async function addTermColumn() {
  try {
    console.log('Adding term column to student_photos table...');
    await query(`
      ALTER TABLE student_photos
      ADD COLUMN IF NOT EXISTS term VARCHAR(50)
    `);
    console.log('✅ Term column added successfully!');

    // Set default value for existing records
    console.log('Setting default term for existing records...');
    const result = await query(`
      UPDATE student_photos
      SET term = 'First Term'
      WHERE term IS NULL
    `);
    console.log(`Updated ${result.rowCount} existing records with default term`);

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

addTermColumn();
