/**
 * Ensure performance indexes for large cohorts (photos, scores, comments by class/year/term).
 * Run once on existing DB: npm run add-indexes-2000 --prefix backend
 * (initDatabase.js creates the same set for new installs; node-pg-migrate also applies operational-query-indexes.)
 */
require('dotenv').config();
const { query } = require('../config/database');

async function run() {
  try {
    await query('CREATE INDEX IF NOT EXISTS idx_students_adm_year ON students(adm_no, year)');
    console.log('✅ idx_students_adm_year');
    await query('CREATE INDEX IF NOT EXISTS idx_students_term ON students(level, stream, year, term)');
    console.log('✅ idx_students_term');
    await query('CREATE INDEX IF NOT EXISTS idx_student_photos_class ON student_photos(level, stream, year)');
    console.log('✅ idx_student_photos_class');
    await query('CREATE INDEX IF NOT EXISTS idx_scores_adm_class ON individual_scores(adm_no, level, stream, year)');
    console.log('✅ idx_scores_adm_class');
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'individual_scores' AND column_name = 'term'
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scores_term ON individual_scores(level, stream, year, term, month)';
        END IF;
      END $$;
    `);
    console.log('✅ idx_scores_term (if column term exists)');
    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'term'
        ) THEN
          EXECUTE 'CREATE INDEX IF NOT EXISTS idx_comments_term_lookup ON comments(comment_type, level, stream, year, term, student_index)';
        END IF;
      END $$;
    `);
    console.log('✅ idx_comments_term_lookup (if column term exists)');
    console.log('Done. Core list/report indexes are ensured.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

run();
