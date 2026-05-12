const { poolFromEnv } = require('./utils/scriptDbPool');

const pool = poolFromEnv('DATABASE_URL', 'LOCAL_DATABASE_URL');

async function checkTables() {
  try {
    const result = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log('Existing tables:');
    result.rows.forEach(row => console.log('  -', row.table_name));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
