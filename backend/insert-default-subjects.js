const { query } = require('./config/database');

async function insertDefaultSubjects() {
  try {
    console.log('Inserting default Pre-Form One Interview Subjects...');
    
    await query(`
      INSERT INTO preformone_interview_subjects 
      (subject_name, subject_code, description, max_marks, interview_duration_minutes) VALUES
      ('Mathematics', 'MATH', 'Mathematics assessment including arithmetic, algebra, and geometry', 100, 45),
      ('English Language', 'ENG', 'English language assessment including reading, writing, and comprehension', 100, 40),
      ('Kiswahili', 'KIS', 'Kiswahili language assessment including reading, writing, and comprehension', 100, 40),
      ('Science', 'SCI', 'General science assessment including biology, chemistry, and physics basics', 100, 50),
      ('Social Studies', 'SOC', 'Social studies assessment including geography, history, and civics', 100, 35),
      ('Religious Education', 'RE', 'Religious education assessment covering moral values and religious studies', 100, 30),
      ('Civics and Moral Education', 'CIV', 'Civics and moral education assessment', 100, 30),
      ('General Knowledge', 'GK', 'General knowledge and current affairs assessment', 100, 25)
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Default Pre-Form One Interview Subjects inserted successfully!');
    
  } catch (error) {
    console.error('❌ Error inserting default subjects:', error.message);
    process.exit(1);
  }
}

insertDefaultSubjects();
