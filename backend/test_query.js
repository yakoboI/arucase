const { query } = require('./config/database');

(async () => {
  try {
    const res = await query(
      'SELECT DISTINCT ON (subject_code) * FROM subjects WHERE level = $1 AND year = $2 ORDER BY subject_code',
      ['FORM VI', 2025]
    );
    console.log('Query result:', res.rows.length, 'subjects found');
    console.log('Subjects:', res.rows.map(s => ({code: s.subject_code, name: s.subject_name, stream: s.stream})));
  } catch(e) {
    console.error('Error:', e.message);
    console.error('Code:', e.code);
  }
})();
