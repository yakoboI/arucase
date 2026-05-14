-- Up Migration
-- Idempotent index for cohort/year lookups (pre–Form One). Skips if table is absent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'preform_one_students'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_preform_one_year ON public.preform_one_students (year);
  END IF;
END
$$;

-- Down Migration
DROP INDEX IF EXISTS public.idx_preform_one_year;
