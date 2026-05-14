-- Up Migration
-- Reconciles legacy preform_one_students (adm_no, sparse columns) with routes + database/create_preformone_table_fixed.sql.
-- No-op when public.preform_one_students does not exist.

-- 1) Rename legacy adm_no -> admission_number
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'preform_one_students' AND column_name = 'adm_no'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'preform_one_students' AND column_name = 'admission_number'
  ) THEN
    ALTER TABLE public.preform_one_students RENAME COLUMN adm_no TO admission_number;
  END IF;
END
$$;

-- 2) Add missing columns
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE 'ALTER TABLE public.preform_one_students ADD COLUMN IF NOT EXISTS serial_number VARCHAR(50)';
  EXECUTE 'ALTER TABLE public.preform_one_students ADD COLUMN IF NOT EXISTS parish VARCHAR(200)';
END
$$;

-- 3) Backfill serial_number then enforce NOT NULL
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.preform_one_students
  SET serial_number = 'PF-LEGACY-' || id::text
  WHERE serial_number IS NULL OR trim(COALESCE(serial_number, '')) = '';
  ALTER TABLE public.preform_one_students ALTER COLUMN serial_number SET NOT NULL;
END
$$;

-- 4) Year NOT NULL
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.preform_one_students
  SET year = COALESCE(
    year,
    EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::integer
  );
  ALTER TABLE public.preform_one_students ALTER COLUMN year SET NOT NULL;
END
$$;

-- 5) Sex: normalize, CHECK, NOT NULL
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.preform_one_students
  SET sex = 'Male'
  WHERE sex IS NULL OR trim(COALESCE(sex, '')) = '' OR sex NOT IN ('Male', 'Female');
  ALTER TABLE public.preform_one_students DROP CONSTRAINT IF EXISTS preform_one_students_sex_check;
  ALTER TABLE public.preform_one_students
    ADD CONSTRAINT preform_one_students_sex_check CHECK (sex IN ('Male', 'Female'));
  ALTER TABLE public.preform_one_students ALTER COLUMN sex SET NOT NULL;
END
$$;

-- 6) Unique admission_number (name matches route error handling for 23505)
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'preform_one_students'
      AND c.conname = 'preform_one_students_admission_number_key'
  ) THEN
    RETURN;
  END IF;
  BEGIN
    ALTER TABLE public.preform_one_students
      ADD CONSTRAINT preform_one_students_admission_number_key UNIQUE (admission_number);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END
$$;

-- 7) Indexes (only when table exists)
DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_preform_one_serial_number ON public.preform_one_students (serial_number)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_preform_one_parish ON public.preform_one_students (parish)';
END
$$;

-- 8) updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regclass('public.preform_one_students') IS NULL THEN
    RETURN;
  END IF;
  DROP TRIGGER IF EXISTS update_preform_one_students_updated_at ON public.preform_one_students;
  CREATE TRIGGER update_preform_one_students_updated_at
    BEFORE UPDATE ON public.preform_one_students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
END
$$;

-- Down Migration
SELECT 1;
