const { query } = require('./config/database');

(async () => {
  try {
    const res = await query('SELECT stream, subject_code, subject_name FROM subjects WHERE level = $1 AND year = $2 ORDER BY stream, subject_code', ['FORM V', 2025]);
    console.log('FORM V 2025 Subjects by Stream:');
    const byStream = {};
    res.rows.forEach(r => {
      if (!byStream[r.stream]) byStream[r.stream] = [];
      byStream[r.stream].push(`${r.subject_code} - ${r.subject_name}`);
    });
    Object.keys(byStream).sort().forEach(stream => {
      console.log(`\n${stream}:`);
      byStream[stream].forEach(s => console.log(`  ${s}`));
    });
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
