-- Fix incorrect term values for students
-- Convert 'Term I' to 'First Term' and 'Term II' to 'Second Term'

-- Update all students with 'Term I' to 'First Term'
UPDATE students
SET term = 'First Term'
WHERE term = 'Term I';

-- Update all students with 'Term II' to 'Second Term'
UPDATE students
SET term = 'Second Term'
WHERE term = 'Term II';

-- Update all individual_scores with 'Term I' to 'First Term'
UPDATE individual_scores
SET term = 'First Term'
WHERE term = 'Term I';

-- Update all individual_scores with 'Term II' to 'Second Term'
UPDATE individual_scores
SET term = 'Second Term'
WHERE term = 'Term II';

-- Show the results
SELECT term, COUNT(*) as student_count
FROM students
GROUP BY term;

SELECT term, COUNT(*) as score_count
FROM individual_scores
GROUP BY term;

COMMIT;
