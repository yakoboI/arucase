-- Create table for Pre-Form One students
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_preform_one_admission_number ON preform_one_students(admission_number);
CREATE INDEX IF NOT EXISTS idx_preform_one_serial_number ON preform_one_students(serial_number);
CREATE INDEX IF NOT EXISTS idx_preform_one_year ON preform_one_students(year);
CREATE INDEX IF NOT EXISTS idx_preform_one_parish ON preform_one_students(parish);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_preform_one_students_updated_at 
    BEFORE UPDATE ON preform_one_students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
