const { query } = require('./config/database');

async function fixInterviewSubjectsData() {
  try {
    console.log('🔄 Fixing interview subjects data...');
    
    // Clear existing data and insert fresh
    await query('DELETE FROM preformone_interview_subjects');
    console.log('✅ Cleared existing subjects');
    
    // Insert default subjects
    await query(`
      INSERT INTO preformone_interview_subjects (subject_name, subject_code) VALUES
      ('Mathematics', 'MATH'),
      ('English Language', 'ENG'),
      ('Kiswahili', 'KIS'),
      ('Science', 'SCI'),
      ('Social Studies', 'SOC'),
      ('Religious Education', 'RE'),
      ('Civics and Moral Education', 'CIV'),
      ('General Knowledge', 'GK')
    `);
    console.log('✅ Default interview subjects inserted successfully!');
    
    console.log('✅ Interview subjects data fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing interview subjects data:', error.message);
    process.exit(1);
  }
}

fixInterviewSubjectsData();
