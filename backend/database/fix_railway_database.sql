-- Fix Railway Database Issues
-- Run this script to fix missing permissions column and preform_one_students table

-- Fix 1: Add missing permissions column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE users ADD COLUMN permissions TEXT;
    END IF;
END $$;

-- Fix 2: Create preform_one_students table if it doesn't exist
CREATE TABLE IF NOT EXISTS preform_one_students (
    id SERIAL PRIMARY KEY,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    serial_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    surname VARCHAR(100) NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('Male', 'Female')),
    parish VARCHAR(200),
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for preform_one_students if they don't exist
CREATE INDEX IF NOT EXISTS idx_preform_one_admission_number ON preform_one_students(admission_number);
CREATE INDEX IF NOT EXISTS idx_preform_one_serial_number ON preform_one_students(serial_number);
CREATE INDEX IF NOT EXISTS idx_preform_one_year ON preform_one_students(year);
CREATE INDEX IF NOT EXISTS idx_preform_one_parish ON preform_one_students(parish);

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for preform_one_students if it doesn't exist
DROP TRIGGER IF EXISTS update_preform_one_students_updated_at ON preform_one_students;
CREATE TRIGGER update_preform_one_students_updated_at 
    BEFORE UPDATE ON preform_one_students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix 3: Create preformone_interview_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS preformone_interview_subjects (
    id SERIAL PRIMARY KEY,
    subject_name VARCHAR(200) NOT NULL UNIQUE,
    subject_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    max_marks INTEGER DEFAULT 100,
    interview_duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for preformone_interview_subjects
CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_code ON preformone_interview_subjects(subject_code);
CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_active ON preformone_interview_subjects(is_active);

-- Create trigger for preformone_interview_subjects
DROP TRIGGER IF EXISTS update_preformone_interview_subjects_updated_at ON preformone_interview_subjects;
CREATE TRIGGER update_preformone_interview_subjects_updated_at
    BEFORE UPDATE ON preformone_interview_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default interview subjects if they don't exist
INSERT INTO preformone_interview_subjects (subject_name, subject_code, description, max_marks, interview_duration_minutes) VALUES
('Mathematics', 'MATH', 'Mathematics assessment including arithmetic, algebra, and geometry', 100, 45),
('English Language', 'ENG', 'English language assessment including reading, writing, and comprehension', 100, 40),
('Kiswahili', 'KIS', 'Kiswahili language assessment including reading, writing, and comprehension', 100, 40),
('Science', 'SCI', 'General science assessment including biology, chemistry, and physics basics', 100, 50),
('Social Studies', 'SOC', 'Social studies assessment including geography, history, and civics', 100, 35),
('Religious Education', 'RE', 'Religious education assessment covering moral values and religious studies', 100, 30),
('Civics and Moral Education', 'CIV', 'Civics and moral education assessment', 100, 30),
('General Knowledge', 'GK', 'General knowledge and current affairs assessment', 100, 25)
ON CONFLICT (subject_name, subject_code) DO NOTHING;

-- Fix 4: Create the preform_one_scores table mentioned in the logs
CREATE TABLE IF NOT EXISTS preform_one_scores (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES preform_one_students(id),
    subject_id INTEGER NOT NULL,
    subject_type VARCHAR(20) NOT NULL CHECK (subject_type IN ('interview', 'continuing')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    grade VARCHAR(2) CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
    remarks TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, subject_type)
);

-- Create trigger for preform_one_scores
DROP TRIGGER IF EXISTS update_preform_one_scores_updated_at ON preform_one_scores;
CREATE TRIGGER update_preform_one_scores_updated_at
    BEFORE UPDATE ON preform_one_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Database fixes completed successfully
