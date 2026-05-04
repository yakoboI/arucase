const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function createPreFormOneTable() {
  try {
    console.log('Creating Pre-Form One students table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/create_preformone_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await query(sql);
    
    console.log('✅ Pre-Form One students table created successfully!');
    
    // Verify table exists
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'preform_one_students'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Table verification successful');
    } else {
      console.log('❌ Table verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error creating Pre-Form One table:', error);
    process.exit(1);
  }
}

createPreFormOneTable();
