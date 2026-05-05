const { query } = require('./config/database');

async function createContinuingSubjectsTable() {
  try {
    console.log('🔄 Creating preformone_continuing_subjects table...');
    
    // Drop existing table if it exists
    await query('DROP TABLE IF EXISTS preformone_continuing_subjects CASCADE');
    console.log('✅ Old table dropped');
    
    // Create simplified table
    await query(`
      CREATE TABLE preformone_continuing_subjects (
        id SERIAL PRIMARY KEY,
        subject_name VARCHAR(200) NOT NULL UNIQUE,
        subject_code VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Pre-Form One Continuing Subjects table created');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_preformone_continuing_subjects_code ON preformone_continuing_subjects(subject_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_preformone_continuing_subjects_active ON preformone_continuing_subjects(is_active)');
    console.log('✅ Continuing subjects indexes created');
    
    // Create trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_preformone_continuing_subjects_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    // Create trigger
    await query(`
      CREATE TRIGGER update_preformone_continuing_subjects_updated_at
        BEFORE UPDATE ON preformone_continuing_subjects
        FOR EACH ROW
        EXECUTE FUNCTION update_preformone_continuing_subjects_updated_at()
    `);
    console.log('✅ Pre-Form One Continuing Subjects triggers created');
    
    // Insert 12 default subjects
    await query(`
      INSERT INTO preformone_continuing_subjects (subject_name, subject_code) VALUES
      ('Mathematics', 'MATH'),
      ('English Language', 'ENG'),
      ('Kiswahili', 'KIS'),
      ('Physics', 'PHY'),
      ('Chemistry', 'CHEM'),
      ('Biology', 'BIO'),
      ('History', 'HIST'),
      ('Geography', 'GEOG'),
      ('Civics', 'CIV'),
      ('Religious Education', 'RE'),
      ('Computer Studies', 'COMP'),
      ('Physical Education', 'PE')
    `);
    console.log('✅ 12 default continuing subjects inserted successfully!');
    
    console.log('✅ Pre-Form One Continuing Subjects database setup completed!');
    
  } catch (error) {
    console.error('❌ Error creating continuing subjects table:', error.message);
    process.exit(1);
  }
}

createContinuingSubjectsTable();
