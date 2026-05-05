-- Create Pre-Form One Interview Subjects table
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_code ON preformone_interview_subjects(subject_code);
CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_active ON preformone_interview_subjects(is_active);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_preformone_interview_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_preformone_interview_subjects_updated_at
    BEFORE UPDATE ON preformone_interview_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_preformone_interview_subjects_updated_at();

-- Insert default interview subjects
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
