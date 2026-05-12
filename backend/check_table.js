const { poolFromEnv } = require('./utils/scriptDbPool');

const pool = poolFromEnv('DATABASE_URL', 'LOCAL_DATABASE_URL');

async function checkTable() {
  try {
    const result = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2', ['preform_one_interview_subjects', 'public']);
    console.log('Existing columns in preform_one_interview_subjects:');
    result.rows.forEach(row => console.log('  -', row.column_name));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
