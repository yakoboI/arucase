/**
 * DTA Monitor - Score Change Audit Table Creation
 * Run: node backend/scripts/createDTAMonitorTable.js
 */
require('dotenv').config();
const { query } = require('../config/database');

async function createDTAMonitorTable() {
  try {
    console.log('Creating score_change_audit table...');
    
    // Create the score_change_audit table
    await query(`
      CREATE TABLE IF NOT EXISTS score_change_audit (
        id SERIAL PRIMARY KEY,
        student_adm_no VARCHAR(50) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        level VARCHAR(50) NOT NULL,
        stream VARCHAR(50) NOT NULL,
        year INTEGER NOT NULL,
        month VARCHAR(20) NOT NULL,
        subject_code VARCHAR(20) NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        initial_score DECIMAL(10,2),
        current_score DECIMAL(10,2),
        change_count INTEGER DEFAULT 0,
        change_history JSONB DEFAULT '[]'::jsonb,
        last_changed_by VARCHAR(100),
        last_changed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_adm_no, level, stream, year, month, subject_code)
      )
    `);
    console.log('✅ score_change_audit table created');
    
    // Create indexes for performance
    await query('CREATE INDEX IF NOT EXISTS idx_score_audit_student ON score_change_audit(student_adm_no, subject_code, year, month)');
    await query('CREATE INDEX IF NOT EXISTS idx_score_audit_changed_by ON score_change_audit(last_changed_by)');
    await query('CREATE INDEX IF NOT EXISTS idx_score_audit_changed_at ON score_change_audit(last_changed_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_score_audit_class ON score_change_audit(level, stream, year, month)');
    await query('CREATE INDEX IF NOT EXISTS idx_score_audit_subject ON score_change_audit(subject_code)');
    console.log('✅ Indexes created');
    
    console.log('\n✅ DTA Monitor table setup complete!');
  } catch (error) {
    console.error('❌ Error creating DTA Monitor table:', error);
    process.exit(1);
  }
}

createDTAMonitorTable();
