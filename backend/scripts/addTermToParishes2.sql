ALTER TABLE student_parishes ADD COLUMN term VARCHAR(50);
UPDATE student_parishes SET term = 'First Term' WHERE term IS NULL;
