const { query } = require('./config/database');

(async () => {
  try {
    const res = await query('SELECT DISTINCT level, stream, year FROM subjects ORDER BY year DESC, level');
    console.log('Available subjects by level/stream/year:');
    res.rows.forEach(r => console.log(`  - ${r.level}, stream ${r.stream}, year ${r.year}`));
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
