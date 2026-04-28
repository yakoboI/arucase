const { query } = require('./config/database');

(async () => {
  try {
    const res = await query('SELECT DISTINCT stream FROM subjects WHERE level = $1 AND year = $2 ORDER BY stream', ['FORM V', 2025]);
    console.log('FORM V 2025 Streams:', res.rows.map(r => r.stream));
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
