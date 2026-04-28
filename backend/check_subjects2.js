const { query } = require('./config/database');

(async () => {
  try {
    const res = await query('SELECT DISTINCT subject_code, subject_name FROM subjects WHERE level = $1 AND year = $2 ORDER BY subject_code', ['FORM V', 2025]);
    console.log('FORM V 2025 Subjects:');
    res.rows.forEach(r => console.log(`  ${r.subject_code} - ${r.subject_name}`));
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
