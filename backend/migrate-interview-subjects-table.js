const { query } = require('./config/database');

async function migrateInterviewSubjectsTable() {
  try {
    console.log('🔄 Migrating interview subjects table to simplified structure...');
    
    // Drop existing table and recreate with simplified structure
    await query('DROP TABLE IF EXISTS preformone_interview_subjects CASCADE');
    console.log('✅ Old table dropped');
    
    // Create simplified table
    await query(`
      CREATE TABLE preformone_interview_subjects (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(200) NOT NULL UNIQUE,
        subject_code VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Simplified interview subjects table created');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_code ON preformone_interview_subjects(subject_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_preformone_interview_subjects_active ON preformone_interview_subjects(is_active)');
    console.log('✅ Interview subjects indexes created');
    
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
      ON CONFLICT (subject_name, subject_code) DO NOTHING
    `);
    console.log('✅ Default interview subjects inserted');
    
    console.log('✅ Interview subjects table migration completed!');
    
  } catch (error) {
    console.error('❌ Error migrating interview subjects table:', error.message);
    process.exit(1);
  }
}

migrateInterviewSubjectsTable();
