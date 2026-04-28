/**
 * Migration Script: Add term column to students table
 * Run: node backend/scripts/addTermColumn.js
 */
require('dotenv').config();
const { query } = require('../config/database');

async function addTermColumn() {
  try {
    console.log('Adding term column to students table...');
    
    // Add term column to students table
    await query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'First Term'
    `);
    console.log('✅ Term column added to students table');
    
    // Update unique constraint to include term
    await query(`
      DO $$
      BEGIN
        -- Drop old unique constraint if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conrelid = 'students'::regclass 
            AND contype = 'u'
            AND conname = 'students_adm_no_level_stream_year_key'
        ) THEN
          ALTER TABLE students DROP CONSTRAINT students_adm_no_level_stream_year_key;
        END IF;
        
        -- Add new unique constraint with term
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conrelid = 'students'::regclass 
            AND contype = 'u'
            AND conname = 'students_adm_no_level_stream_year_term_key'
        ) THEN
          ALTER TABLE students 
          ADD CONSTRAINT students_adm_no_level_stream_year_term_key 
          UNIQUE(adm_no, level, stream, year, term);
        END IF;
      END $$;
    `);
    console.log('✅ Unique constraint updated to include term');
    
    // Add term column to individual_scores table
    await query(`
      ALTER TABLE individual_scores 
      ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'First Term'
    `);
    console.log('✅ Term column added to individual_scores table');
    
    // Update unique constraint for individual_scores
    await query(`
      DO $$
      BEGIN
        -- Drop old unique constraint if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conrelid = 'individual_scores'::regclass 
            AND contype = 'u'
            AND conname = 'individual_scores_level_stream_year_month_subject_code_adm_no_key'
        ) THEN
          ALTER TABLE individual_scores DROP CONSTRAINT individual_scores_level_stream_year_month_subject_code_adm_no_key;
        END IF;
        
        -- Add new unique constraint with term
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conrelid = 'individual_scores'::regclass 
            AND contype = 'u'
            AND conname = 'individual_scores_level_stream_year_term_month_subject_code_adm_no_key'
        ) THEN
          ALTER TABLE individual_scores 
          ADD CONSTRAINT individual_scores_level_stream_year_term_month_subject_code_adm_no_key 
          UNIQUE(level, stream, year, term, month, subject_code, adm_no);
        END IF;
      END $$;
    `);
    console.log('✅ Unique constraint updated for individual_scores to include term');
    
    // Add index for term to improve query performance
    await query('CREATE INDEX IF NOT EXISTS idx_students_term ON students(level, stream, year, term)');
    console.log('✅ Index created for students term queries');
    
    await query('CREATE INDEX IF NOT EXISTS idx_scores_term ON individual_scores(level, stream, year, term, month)');
    console.log('✅ Index created for scores term queries');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('Please update existing student records to set their term appropriately.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addTermColumn();
