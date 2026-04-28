-- Migration: Add term column to students and individual_scores tables
-- Run this SQL manually in your PostgreSQL database

-- Add term column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'First Term';

-- Update unique constraint for students to include term
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

-- Add term column to individual_scores table
ALTER TABLE individual_scores 
ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'First Term';

-- Update unique constraint for individual_scores to include term
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

-- Create index for students term queries
CREATE INDEX IF NOT EXISTS idx_students_term ON students(level, stream, year, term);

-- Create index for scores term queries
CREATE INDEX IF NOT EXISTS idx_scores_term ON individual_scores(level, stream, year, term, month);

-- Update existing students to have term = 'First Term' by default
UPDATE students SET term = 'First Term' WHERE term IS NULL;

-- Update existing scores to have term = 'First Term' by default
UPDATE individual_scores SET term = 'First Term' WHERE term IS NULL;

COMMIT;
