const { query } = require('../config/database');

async function checkConstraints() {
  try {
    const result = await query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'students'::regclass
      ORDER BY conname
    `);
    console.log('students table constraints:');
    result.rows.forEach(row => {
      console.log(`  - ${row.constraint_name} (${row.constraint_type}): ${row.constraint_definition}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

checkConstraints();
