-- Up Migration
-- Common list/report paths: student by class + term-aware comments/scores when those columns exist.

CREATE INDEX IF NOT EXISTS idx_scores_adm_class ON public.individual_scores (adm_no, level, stream, year);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'term'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_term ON public.students (level, stream, year, term)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'individual_scores' AND column_name = 'term'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_scores_term ON public.individual_scores (level, stream, year, term, month)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'term'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_comments_term_lookup ON public.comments (comment_type, level, stream, year, term, student_index)';
  END IF;
END $$;

-- Down Migration

DROP INDEX IF EXISTS public.idx_comments_term_lookup;
DROP INDEX IF EXISTS public.idx_scores_term;
DROP INDEX IF EXISTS public.idx_students_term;
DROP INDEX IF EXISTS public.idx_scores_adm_class;
