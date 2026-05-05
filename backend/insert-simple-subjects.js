const { query } = require('./config/database');

async function insertSimpleSubjects() {
  try {
    console.log('Inserting simple Pre-Form One Interview Subjects...');
    
    // Check if subjects already exist
    const existingSubjects = await query('SELECT COUNT(*) as count FROM preformone_interview_subjects');
    console.log('🔍 Existing subjects count:', existingSubjects.rows[0].count);
    
    if (existingSubjects.rows[0].count === 0) {
      // Insert default subjects only if table is empty
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
    } else {
      console.log('ℹ️ Interview subjects already exist, skipping insertion');
    }
    
    console.log('✅ Simple interview subjects insertion completed!');
    
  } catch (error) {
    console.error('❌ Error inserting simple subjects:', error.message);
    process.exit(1);
  }
}

insertSimpleSubjects();
