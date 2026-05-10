const { Pool } = require('pg');

const railwayPool = new Pool({
  host: 'turntable.proxy.rlwy.net',
  port: 10105,
  user: 'postgres',
  password: 'xqvmJmNREUpfMdMtbtcpLktoWiedvrst',
  database: 'railway'
});

async function fixRailwaySchema() {
  console.log('🔧 Fixing Railway database schema...');
  
  try {
    // Fix 1: Add missing term column to individual_scores
    console.log('📝 Adding term column to individual_scores...');
    await railwayPool.query(`
      ALTER TABLE individual_scores 
      ADD COLUMN IF NOT EXISTS term VARCHAR(20) DEFAULT 'First Term'
    `);
    console.log('✅ Added term column to individual_scores');

    // Fix 2: Add missing admission_number column to preform_one_students
    console.log('📝 Adding admission_number column to preform_one_students...');
    await railwayPool.query(`
      ALTER TABLE preform_one_students 
      ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50) UNIQUE
    `);
    console.log('✅ Added admission_number column to preform_one_students');

    // Fix 3: Check and fix foreign key constraints
    console.log('🔍 Checking preform_one_students table structure...');
    const tableStructure = await railwayPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'preform_one_students'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 preform_one_students structure:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('✅ Schema fixes completed');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

fixRailwaySchema()
  .then(() => {
    console.log('✅ Schema fixes completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema fixes failed:', error);
    process.exit(1);
  });
