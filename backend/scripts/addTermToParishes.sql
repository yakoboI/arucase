-- Add term column to student_parishes table
ALTER TABLE student_parishes ADD COLUMN IF NOT EXISTS term VARCHAR(50);

-- Set default term for existing records to 'First Term'
UPDATE student_parishes SET term = 'First Term' WHERE term IS NULL;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_parishes' 
AND column_name = 'term';

COMMIT;
