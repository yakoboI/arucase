const { poolFromEnv } = require('./utils/scriptDbPool');

const pool = poolFromEnv('DATABASE_URL', 'LOCAL_DATABASE_URL');

async function checkResults() {
  try {
    const interviewResult = await pool.query('SELECT COUNT(*) as count FROM preform_one_interview_results WHERE year = $1', [2025]);
    console.log('🔍 Interview results count for 2025:', interviewResult.rows[0].count);
    
    const continuingResult = await pool.query('SELECT COUNT(*) as count FROM preform_one_continuing_results WHERE year = $1', [2025]);
    console.log('🔍 Continuing results count for 2025:', continuingResult.rows[0].count);
    
  } catch (error) {
    console.error('Error checking results:', error);
  } finally {
    await pool.end();
  }
}

checkResults();
